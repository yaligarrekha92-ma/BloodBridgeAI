import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status

from app.config import settings
from app.models.models import (
    BloodUnit,
    InventoryTransaction,
    Reservation,
    BloodRequest,
    RequestFulfillment,
    AuditLog,
    User,
    Hospital
)
from app.schemas.schemas import BloodUnitCreate, BloodUnitUpdate

def calculate_expiry(component_type: str, collection_date: datetime.datetime) -> datetime.datetime:
    shelf_life = settings.SHELF_LIFE_DAYS.get(component_type, 35)
    return collection_date + datetime.timedelta(days=shelf_life)

def create_blood_unit(db: Session, unit_in: BloodUnitCreate, current_user: Optional[User] = None) -> BloodUnit:
    now = datetime.datetime.utcnow()
    collection_date = unit_in.collection_date or now
    expiry_date = unit_in.expiry_date or calculate_expiry(unit_in.component_type, collection_date)

    if expiry_date <= collection_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date must be after collection date"
        )

    # Generate unit number if not supplied
    if not unit_in.unit_number:
        hosp = db.query(Hospital).filter(Hospital.id == unit_in.hospital_id).first()
        hosp_code = hosp.code if hosp else f"H{unit_in.hospital_id}"
        clean_grp = unit_in.blood_group.replace("+", "-POS").replace("-", "-NEG")
        ts_suffix = int(now.timestamp()) % 100000
        unit_number = f"BLD-{hosp_code}-{clean_grp}-{ts_suffix}"
    else:
        unit_number = unit_in.unit_number

    # Check uniqueness
    existing = db.query(BloodUnit).filter(BloodUnit.unit_number == unit_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Blood unit with ID '{unit_number}' already exists")

    unit = BloodUnit(
        unit_number=unit_number,
        hospital_id=unit_in.hospital_id,
        donation_id=unit_in.donation_id,
        blood_group=unit_in.blood_group,
        component_type=unit_in.component_type,
        collection_date=collection_date,
        expiry_date=expiry_date,
        storage_location=unit_in.storage_location,
        status=unit_in.status,
        quality_screening_status=unit_in.quality_screening_status,
        is_reserved=False
    )
    db.add(unit)
    db.flush()

    # Record intake transaction
    txn = InventoryTransaction(
        unit_id=unit.id,
        hospital_id=unit.hospital_id,
        user_id=current_user.id if current_user else None,
        transaction_type="Intake",
        notes=f"Unit {unit.unit_number} logged into inventory at {unit.storage_location}"
    )
    db.add(txn)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "system",
        hospital_id=unit.hospital_id,
        action="CREATE_BLOOD_UNIT",
        resource_type="BloodUnit",
        resource_id=str(unit.id),
        details=f"Created {unit.blood_group} {unit.component_type} unit {unit.unit_number}"
    )
    db.add(audit)
    db.commit()
    db.refresh(unit)
    return unit

def get_eligible_units(
    db: Session,
    hospital_id: int,
    blood_group: str,
    component_type: str,
    required_count: int = 1
) -> List[BloodUnit]:
    """
    Returns verified clinically eligible, unreserved, passed-screening, non-expired units
    sorted by earliest expiry date first (FIFO: First-In-First-Out).
    """
    now = datetime.datetime.utcnow()
    units = (
        db.query(BloodUnit)
        .filter(
            BloodUnit.hospital_id == hospital_id,
            BloodUnit.blood_group == blood_group,
            BloodUnit.component_type == component_type,
            BloodUnit.status == "Available",
            BloodUnit.is_reserved == False,
            BloodUnit.quality_screening_status == "Passed",
            BloodUnit.expiry_date > now
        )
        .order_by(BloodUnit.expiry_date.asc())
        .limit(required_count)
        .all()
    )
    return units

def reserve_blood_unit(db: Session, unit_id: int, request_id: int, user: User, notes: Optional[str] = None) -> Reservation:
    now = datetime.datetime.utcnow()
    # Transactional lock on the unit
    unit = db.query(BloodUnit).with_for_update().filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")

    if unit.status != "Available" or unit.is_reserved:
        raise HTTPException(status_code=400, detail=f"Unit {unit.unit_number} is already {unit.status} or reserved")
    if unit.quality_screening_status != "Passed":
        raise HTTPException(status_code=400, detail=f"Unit {unit.unit_number} has not passed quality screening")
    if unit.expiry_date <= now:
        raise HTTPException(status_code=400, detail=f"Unit {unit.unit_number} has expired and cannot be reserved")

    req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Associated blood request not found")

    unit.is_reserved = True
    unit.status = "Reserved"

    reservation = Reservation(
        request_id=request_id,
        unit_id=unit_id,
        reserved_by_user_id=user.id,
        reserved_at=now,
        expires_at=now + datetime.timedelta(hours=24),  # Standard 24h reservation hold
        status="Active"
    )
    db.add(reservation)

    txn = InventoryTransaction(
        unit_id=unit.id,
        hospital_id=unit.hospital_id,
        user_id=user.id,
        transaction_type="Reserve",
        notes=f"Reserved for Request {req.request_code} (Patient: {req.patient_ref}). Notes: {notes or ''}"
    )
    db.add(txn)

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        hospital_id=unit.hospital_id,
        action="RESERVE_UNIT",
        resource_type="BloodUnit",
        resource_id=str(unit.id),
        details=f"Reserved unit {unit.unit_number} for request {req.request_code}"
    )
    db.add(audit)
    db.commit()
    db.refresh(reservation)
    return reservation

def issue_blood_unit(
    db: Session,
    unit_id: int,
    user: User,
    request_id: Optional[int] = None,
    patient_ref: Optional[str] = None,
    notes: Optional[str] = None
) -> BloodUnit:
    now = datetime.datetime.utcnow()
    unit = db.query(BloodUnit).with_for_update().filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")

    if unit.status == "Issued":
        raise HTTPException(status_code=400, detail=f"DOUBLE ISSUANCE PREVENTED: Unit {unit.unit_number} has already been issued")
    if unit.status in ["Discarded", "Expired"]:
        raise HTTPException(status_code=400, detail=f"Unit {unit.unit_number} is marked as {unit.status} and cannot be issued")
    if unit.expiry_date <= now:
        raise HTTPException(status_code=400, detail=f"EXPIRED UNIT: Unit {unit.unit_number} expired on {unit.expiry_date} and cannot be transfused")

    unit.status = "Issued"
    unit.is_reserved = False

    # If linked to an active reservation, close reservation
    active_res = db.query(Reservation).filter(
        Reservation.unit_id == unit.id,
        Reservation.status == "Active"
    ).first()
    if active_res:
        active_res.status = "Converted_To_Issue"

    if request_id:
        req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if req:
            req.units_allocated += 1
            if req.units_allocated >= req.units_requested:
                req.status = "Fulfilled"
            else:
                req.status = "Partially_Fulfilled"

            fulfillment = RequestFulfillment(
                request_id=req.id,
                unit_id=unit.id,
                fulfilled_by_user_id=user.id,
                fulfilled_at=now,
                notes=notes
            )
            db.add(fulfillment)

    txn = InventoryTransaction(
        unit_id=unit.id,
        hospital_id=unit.hospital_id,
        user_id=user.id,
        transaction_type="Issue",
        notes=f"Issued for transfusion. Patient Ref: {patient_ref or 'Direct Request'}. {notes or ''}"
    )
    db.add(txn)

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        hospital_id=unit.hospital_id,
        action="ISSUE_UNIT",
        resource_type="BloodUnit",
        resource_id=str(unit.id),
        details=f"Issued {unit.unit_number} ({unit.blood_group} {unit.component_type})"
    )
    db.add(audit)
    db.commit()
    db.refresh(unit)
    return unit

def discard_blood_unit(db: Session, unit_id: int, user: User, reason: str) -> BloodUnit:
    unit = db.query(BloodUnit).with_for_update().filter(BloodUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Blood unit not found")

    unit.status = "Discarded"
    unit.is_reserved = False

    txn = InventoryTransaction(
        unit_id=unit.id,
        hospital_id=unit.hospital_id,
        user_id=user.id,
        transaction_type="Discard",
        notes=f"Unit discarded: {reason}"
    )
    db.add(txn)

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        hospital_id=unit.hospital_id,
        action="DISCARD_UNIT",
        resource_type="BloodUnit",
        resource_id=str(unit.id),
        details=f"Discarded {unit.unit_number}: {reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(unit)
    return unit
