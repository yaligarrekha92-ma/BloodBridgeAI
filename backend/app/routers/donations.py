import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Donation, Donor, Hospital, BloodUnit, InventoryTransaction, User, AuditLog
from app.schemas.schemas import DonationCreate, DonationResponse, DonorCreate, DonorResponse
from app.services.auth_service import get_current_user, require_roles, verify_hospital_access
from app.services.inventory_service import calculate_expiry

router = APIRouter(prefix="/donations", tags=["Donation Management"])

@router.get("", response_model=List[DonationResponse])
def list_donations(
    hospital_id: Optional[int] = Query(None),
    blood_group: Optional[str] = Query(None),
    screening_status: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Donation)
    effective_hospital_id = hospital_id
    if current_user.role != "SUPER_ADMIN":
        if hospital_id and hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        effective_hospital_id = current_user.hospital_id

    if effective_hospital_id:
        query = query.filter(Donation.hospital_id == effective_hospital_id)
    if blood_group:
        query = query.filter(Donation.blood_group == blood_group)
    if screening_status:
        query = query.filter(Donation.screening_status == screening_status)

    donations = query.order_by(Donation.donation_date.desc()).offset(offset).limit(limit).all()
    return donations

@router.post("", response_model=DonationResponse, status_code=status.HTTP_201_CREATED)
def register_donation(
    payload: DonationCreate,
    create_blood_unit_automatically: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    if not verify_hospital_access(current_user, payload.hospital_id):
        raise HTTPException(status_code=403, detail="Cannot record donations for external facility")

    donor = db.query(Donor).filter(Donor.id == payload.donor_id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor record not found")

    now = datetime.datetime.utcnow()
    ts_code = int(now.timestamp()) % 100000
    donation_code = f"DON-{payload.blood_group.replace('+', 'P').replace('-', 'N')}-{ts_code}"

    donation = Donation(
        donation_code=donation_code,
        donor_id=payload.donor_id,
        hospital_id=payload.hospital_id,
        donation_date=now,
        blood_group=payload.blood_group,
        component_type=payload.component_type,
        volume_ml=payload.volume_ml,
        screening_status=payload.screening_status,
        notes=payload.notes
    )
    db.add(donation)
    db.flush()

    # Update donor stats
    donor.total_donations += 1
    donor.last_donation_date = now

    # If screening passed and auto unit creation requested, initialize blood unit in quarantine/available
    if create_blood_unit_automatically and payload.screening_status == "Passed":
        hosp = db.query(Hospital).filter(Hospital.id == payload.hospital_id).first()
        hosp_code = hosp.code if hosp else f"H{payload.hospital_id}"
        expiry = calculate_expiry(payload.component_type, now)
        clean_grp = payload.blood_group.replace("+", "-POS").replace("-", "-NEG")

        unit = BloodUnit(
            unit_number=f"BLD-{hosp_code}-{clean_grp}-{ts_code}",
            hospital_id=payload.hospital_id,
            donation_id=donation.id,
            blood_group=payload.blood_group,
            component_type=payload.component_type,
            collection_date=now,
            expiry_date=expiry,
            storage_location="Quarantine Shelf A",
            status="Available",
            quality_screening_status="Passed",
            is_reserved=False
        )
        db.add(unit)
        db.flush()

        txn = InventoryTransaction(
            unit_id=unit.id,
            hospital_id=payload.hospital_id,
            user_id=current_user.id,
            transaction_type="Intake",
            notes=f"Derived from donation {donation.donation_code}"
        )
        db.add(txn)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        hospital_id=payload.hospital_id,
        action="REGISTER_DONATION",
        resource_type="Donation",
        resource_id=str(donation.id),
        details=f"Registered donation {donation.donation_code} ({payload.blood_group} {payload.component_type})"
    )
    db.add(audit)
    db.commit()
    db.refresh(donation)
    return donation

@router.get("/donors", response_model=List[DonorResponse])
def list_donors(
    blood_group: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Donor)
    if blood_group:
        query = query.filter(Donor.blood_group == blood_group)
    return query.order_by(Donor.id.asc()).limit(limit).all()

@router.post("/donors", response_model=DonorResponse, status_code=status.HTTP_201_CREATED)
def register_donor(
    payload: DonorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    existing = db.query(Donor).filter(Donor.donor_code == payload.donor_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Donor code already exists")

    donor = Donor(
        donor_code=payload.donor_code,
        age_group=payload.age_group,
        gender=payload.gender,
        blood_group=payload.blood_group,
        eligibility_status=payload.eligibility_status,
        total_donations=0,
        last_donation_date=None
    )
    db.add(donor)
    db.commit()
    db.refresh(donor)
    return donor
