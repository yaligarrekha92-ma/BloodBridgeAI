import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.models.models import BloodUnit, Hospital, InventoryTransaction, User
from app.schemas.schemas import (
    BloodUnitResponse,
    BloodUnitCreate,
    BloodUnitUpdate,
    UnitReserveRequest,
    UnitIssueRequest
)
from app.services.auth_service import get_current_user, require_roles, verify_hospital_access
from app.services.inventory_service import (
    create_blood_unit,
    reserve_blood_unit,
    issue_blood_unit,
    discard_blood_unit
)

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

@router.get("", response_model=List[BloodUnitResponse])
def list_inventory(
    hospital_id: Optional[int] = Query(None),
    blood_group: Optional[str] = Query(None),
    component_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    expiring_within_days: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BloodUnit).join(Hospital, BloodUnit.hospital_id == Hospital.id)

    # Hospital isolation: staff and hospital admins can only view their hospital unless super admin
    effective_hospital_id = hospital_id
    if current_user.role != "SUPER_ADMIN":
        if hospital_id and hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to external hospital inventory")
        effective_hospital_id = current_user.hospital_id

    if effective_hospital_id:
        query = query.filter(BloodUnit.hospital_id == effective_hospital_id)

    if blood_group:
        query = query.filter(BloodUnit.blood_group == blood_group)
    if component_type:
        query = query.filter(BloodUnit.component_type == component_type)
    if status_filter:
        query = query.filter(BloodUnit.status == status_filter)

    now = datetime.datetime.utcnow()
    if expiring_within_days is not None:
        target_date = now + datetime.timedelta(days=expiring_within_days)
        query = query.filter(BloodUnit.expiry_date <= target_date, BloodUnit.expiry_date > now)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                BloodUnit.unit_number.ilike(search_pattern),
                BloodUnit.storage_location.ilike(search_pattern),
                Hospital.name.ilike(search_pattern)
            )
        )

    units = query.order_by(BloodUnit.expiry_date.asc()).offset(offset).limit(limit).all()

    # Populate helper fields for response
    results = []
    for u in units:
        diff_days = max(0, (u.expiry_date - now).days)
        res_item = BloodUnitResponse(
            id=u.id,
            unit_number=u.unit_number,
            hospital_id=u.hospital_id,
            donation_id=u.donation_id,
            blood_group=u.blood_group,
            component_type=u.component_type,
            storage_location=u.storage_location,
            status=u.status,
            quality_screening_status=u.quality_screening_status,
            is_reserved=u.is_reserved,
            collection_date=u.collection_date,
            expiry_date=u.expiry_date,
            created_at=u.created_at,
            updated_at=u.updated_at,
            hospital_name=u.hospital.name if u.hospital else None,
            days_to_expiry=diff_days
        )
        results.append(res_item)

    return results

@router.get("/{unit_id}", response_model=BloodUnitResponse)
def get_unit_details(unit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    unit = db.query(BloodUnit).filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")
    if not verify_hospital_access(current_user, unit.hospital_id):
        raise HTTPException(status_code=403, detail="Unauthorized access to external hospital blood unit")

    now = datetime.datetime.utcnow()
    diff_days = max(0, (unit.expiry_date - now).days)
    return BloodUnitResponse(
        id=unit.id,
        unit_number=unit.unit_number,
        hospital_id=unit.hospital_id,
        donation_id=unit.donation_id,
        blood_group=unit.blood_group,
        component_type=unit.component_type,
        storage_location=unit.storage_location,
        status=unit.status,
        quality_screening_status=unit.quality_screening_status,
        is_reserved=unit.is_reserved,
        collection_date=unit.collection_date,
        expiry_date=unit.expiry_date,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
        hospital_name=unit.hospital.name if unit.hospital else None,
        days_to_expiry=diff_days
    )

@router.post("", response_model=BloodUnitResponse, status_code=status.HTTP_201_CREATED)
def add_inventory_unit(
    unit_in: BloodUnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    if not verify_hospital_access(current_user, unit_in.hospital_id):
        raise HTTPException(status_code=403, detail="Cannot create blood unit for other hospitals")

    unit = create_blood_unit(db, unit_in, current_user)
    now = datetime.datetime.utcnow()
    diff_days = max(0, (unit.expiry_date - now).days)
    return BloodUnitResponse(
        id=unit.id,
        unit_number=unit.unit_number,
        hospital_id=unit.hospital_id,
        donation_id=unit.donation_id,
        blood_group=unit.blood_group,
        component_type=unit.component_type,
        storage_location=unit.storage_location,
        status=unit.status,
        quality_screening_status=unit.quality_screening_status,
        is_reserved=unit.is_reserved,
        collection_date=unit.collection_date,
        expiry_date=unit.expiry_date,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
        hospital_name=unit.hospital.name if unit.hospital else None,
        days_to_expiry=diff_days
    )

@router.patch("/{unit_id}", response_model=BloodUnitResponse)
def update_unit(
    unit_id: int,
    unit_up: BloodUnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    unit = db.query(BloodUnit).filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")
    if not verify_hospital_access(current_user, unit.hospital_id):
        raise HTTPException(status_code=403, detail="Cannot edit unit from external hospital")

    if unit_up.storage_location:
        unit.storage_location = unit_up.storage_location
    if unit_up.status:
        unit.status = unit_up.status
    if unit_up.quality_screening_status:
        unit.quality_screening_status = unit_up.quality_screening_status

    db.commit()
    db.refresh(unit)

    now = datetime.datetime.utcnow()
    diff_days = max(0, (unit.expiry_date - now).days)
    return BloodUnitResponse(
        id=unit.id,
        unit_number=unit.unit_number,
        hospital_id=unit.hospital_id,
        donation_id=unit.donation_id,
        blood_group=unit.blood_group,
        component_type=unit.component_type,
        storage_location=unit.storage_location,
        status=unit.status,
        quality_screening_status=unit.quality_screening_status,
        is_reserved=unit.is_reserved,
        collection_date=unit.collection_date,
        expiry_date=unit.expiry_date,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
        hospital_name=unit.hospital.name if unit.hospital else None,
        days_to_expiry=diff_days
    )

@router.post("/{unit_id}/reserve")
def reserve_unit(
    unit_id: int,
    payload: UnitReserveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    unit = db.query(BloodUnit).filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")
    if not verify_hospital_access(current_user, unit.hospital_id):
        raise HTTPException(status_code=403, detail="Cannot reserve unit from another hospital")

    res = reserve_blood_unit(db, unit_id, payload.request_id, current_user, payload.notes)
    return {"message": f"Unit {unit.unit_number} reserved successfully", "reservation_id": res.id}

@router.post("/{unit_id}/issue")
def issue_unit(
    unit_id: int,
    payload: UnitIssueRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    unit = db.query(BloodUnit).filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")
    if not verify_hospital_access(current_user, unit.hospital_id):
        raise HTTPException(status_code=403, detail="Cannot issue unit from another hospital")

    unit = issue_blood_unit(
        db,
        unit_id=unit_id,
        user=current_user,
        request_id=payload.request_id,
        patient_ref=payload.patient_ref,
        notes=payload.notes
    )
    return {"message": f"Unit {unit.unit_number} issued for transfusion successfully", "unit_id": unit.id}

@router.post("/{unit_id}/discard")
def discard_unit(
    unit_id: int,
    reason: str = Query("Expired or Quality Defect"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    unit = db.query(BloodUnit).filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")
    if not verify_hospital_access(current_user, unit.hospital_id):
        raise HTTPException(status_code=403, detail="Cannot discard unit from another hospital")

    unit = discard_blood_unit(db, unit_id, current_user, reason)
    return {"message": f"Unit {unit.unit_number} recorded as discarded", "unit_id": unit.id}

@router.get("/{unit_id}/transactions")
def get_unit_transactions(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unit = db.query(BloodUnit).filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")
    if not verify_hospital_access(current_user, unit.hospital_id):
        raise HTTPException(status_code=403, detail="Unauthorized")

    txns = db.query(InventoryTransaction).filter(InventoryTransaction.unit_id == unit_id).order_by(InventoryTransaction.timestamp.desc()).all()
    return txns
