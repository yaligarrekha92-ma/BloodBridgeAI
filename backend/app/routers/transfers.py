import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    BloodTransfer,
    Hospital,
    BloodUnit,
    InventoryTransaction,
    User,
    AuditLog
)
from app.schemas.schemas import BloodTransferResponse, BloodTransferCreate
from app.services.auth_service import get_current_user, require_roles, verify_hospital_access
from app.services.inventory_service import calculate_expiry

router = APIRouter(prefix="/transfers", tags=["Inter-Hospital Transfers"])

@router.get("", response_model=List[BloodTransferResponse])
def list_transfers(
    hospital_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BloodTransfer)
    if hospital_id:
        query = query.filter(
            (BloodTransfer.source_hospital_id == hospital_id) |
            (BloodTransfer.destination_hospital_id == hospital_id)
        )
    if status_filter:
        query = query.filter(BloodTransfer.status == status_filter)

    transfers = query.order_by(BloodTransfer.created_at.desc()).limit(limit).all()

    results = []
    for t in transfers:
        src = db.query(Hospital).filter(Hospital.id == t.source_hospital_id).first()
        dest = db.query(Hospital).filter(Hospital.id == t.destination_hospital_id).first()
        results.append(BloodTransferResponse(
            id=t.id,
            transfer_code=t.transfer_code,
            recommendation_id=t.recommendation_id,
            source_hospital_id=t.source_hospital_id,
            source_hospital_name=src.name if src else None,
            destination_hospital_id=t.destination_hospital_id,
            destination_hospital_name=dest.name if dest else None,
            blood_group=t.blood_group,
            component_type=t.component_type,
            units_count=t.units_count,
            status=t.status,
            dispatch_time=t.dispatch_time,
            estimated_arrival=t.estimated_arrival,
            received_time=t.received_time,
            carrier_info=t.carrier_info,
            created_at=t.created_at
        ))
    return results

@router.post("", response_model=BloodTransferResponse, status_code=status.HTTP_201_CREATED)
def create_manual_transfer(
    payload: BloodTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN"))
):
    if payload.source_hospital_id == payload.destination_hospital_id:
        raise HTTPException(status_code=400, detail="Source and destination hospitals cannot be identical")

    now = datetime.datetime.utcnow()
    ts_code = int(now.timestamp()) % 100000
    transfer_code = f"TRF-{payload.blood_group.replace('+', 'P').replace('-', 'N')}-{ts_code}"

    transfer = BloodTransfer(
        transfer_code=transfer_code,
        recommendation_id=payload.recommendation_id,
        source_hospital_id=payload.source_hospital_id,
        destination_hospital_id=payload.destination_hospital_id,
        blood_group=payload.blood_group,
        component_type=payload.component_type,
        units_count=payload.units_count,
        status="Scheduled",
        dispatch_time=now + datetime.timedelta(hours=1),
        estimated_arrival=now + datetime.timedelta(hours=4),
        carrier_info=payload.carrier_info
    )
    db.add(transfer)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        hospital_id=payload.source_hospital_id,
        action="CREATE_TRANSFER",
        resource_type="BloodTransfer",
        resource_id=transfer_code,
        details=f"Scheduled transfer of {payload.units_count} units ({payload.blood_group}) to Hospital #{payload.destination_hospital_id}"
    )
    db.add(audit)
    db.commit()
    db.refresh(transfer)

    src = db.query(Hospital).filter(Hospital.id == transfer.source_hospital_id).first()
    dest = db.query(Hospital).filter(Hospital.id == transfer.destination_hospital_id).first()
    return BloodTransferResponse(
        id=transfer.id,
        transfer_code=transfer.transfer_code,
        recommendation_id=transfer.recommendation_id,
        source_hospital_id=transfer.source_hospital_id,
        source_hospital_name=src.name if src else None,
        destination_hospital_id=transfer.destination_hospital_id,
        destination_hospital_name=dest.name if dest else None,
        blood_group=transfer.blood_group,
        component_type=transfer.component_type,
        units_count=transfer.units_count,
        status=transfer.status,
        dispatch_time=transfer.dispatch_time,
        estimated_arrival=transfer.estimated_arrival,
        received_time=transfer.received_time,
        carrier_info=transfer.carrier_info,
        created_at=transfer.created_at
    )

@router.post("/{transfer_id}/dispatch")
def dispatch_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    transfer = db.query(BloodTransfer).filter(BloodTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer record not found")

    transfer.status = "In_Transit"
    transfer.dispatch_time = datetime.datetime.utcnow()
    db.commit()
    return {"message": f"Transfer {transfer.transfer_code} marked as In_Transit", "transfer_id": transfer.id}

@router.post("/{transfer_id}/receive")
def receive_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    transfer = db.query(BloodTransfer).filter(BloodTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer record not found")

    now = datetime.datetime.utcnow()
    transfer.status = "Received"
    transfer.received_time = now

    # Ingest units into destination hospital inventory
    dest_hosp = db.query(Hospital).filter(Hospital.id == transfer.destination_hospital_id).first()
    hosp_code = dest_hosp.code if dest_hosp else f"H{transfer.destination_hospital_id}"

    for i in range(transfer.units_count):
        unit_num = f"BLD-TRF-{hosp_code}-{int(now.timestamp()) % 10000}-{i+1}"
        new_unit = BloodUnit(
            unit_number=unit_num,
            hospital_id=transfer.destination_hospital_id,
            blood_group=transfer.blood_group,
            component_type=transfer.component_type,
            collection_date=now - datetime.timedelta(days=3),
            expiry_date=now + datetime.timedelta(days=25),
            storage_location="Transfer Intake Shelf",
            status="Available",
            quality_screening_status="Passed",
            is_reserved=False
        )
        db.add(new_unit)
        db.flush()

        txn = InventoryTransaction(
            unit_id=new_unit.id,
            hospital_id=transfer.destination_hospital_id,
            user_id=current_user.id,
            transaction_type="Transfer_In",
            notes=f"Received via Transfer {transfer.transfer_code} from Hospital #{transfer.source_hospital_id}"
        )
        db.add(txn)

    db.commit()
    return {"message": f"Transfer {transfer.transfer_code} received; {transfer.units_count} units added to destination inventory"}
