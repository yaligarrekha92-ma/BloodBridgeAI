from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Hospital, User
from app.schemas.schemas import HospitalResponse, HospitalCreate
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])

@router.get("", response_model=List[HospitalResponse])
def get_hospitals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # All authenticated users can view participating network facilities
    hospitals = db.query(Hospital).order_by(Hospital.id.asc()).all()
    return hospitals

@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital(hospital_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hosp

@router.post("", response_model=HospitalResponse, status_code=status.HTTP_201_CREATED)
def create_hospital(
    hospital_in: HospitalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN"))
):
    existing = db.query(Hospital).filter(Hospital.code == hospital_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Hospital with code '{hospital_in.code}' already exists")

    hosp = Hospital(
        name=hospital_in.name,
        code=hospital_in.code,
        address=hospital_in.address,
        city=hospital_in.city,
        state=hospital_in.state,
        contact_phone=hospital_in.contact_phone,
        contact_email=hospital_in.contact_email,
        tier=hospital_in.tier,
        lat=hospital_in.lat,
        lng=hospital_in.lng
    )
    db.add(hosp)
    db.commit()
    db.refresh(hosp)
    return hosp
