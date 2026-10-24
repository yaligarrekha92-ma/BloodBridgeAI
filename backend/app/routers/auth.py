import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Hospital
from app.schemas.schemas import LoginRequest, Token, UserResponse, UserCreate
from app.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_roles
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    hosp = db.query(Hospital).filter(Hospital.id == user.hospital_id).first() if user.hospital_id else None

    token_data = {
        "sub": user.email,
        "role": user.role,
        "hospital_id": user.hospital_id
    }
    access_token = create_access_token(data=token_data)

    user_info = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "hospital_id": user.hospital_id,
        "hospital_name": hosp.name if hosp else "All Network Hospitals"
    }

    return {"access_token": access_token, "token_type": "bearer", "user": user_info}

@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == current_user.hospital_id).first() if current_user.hospital_id else None
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "hospital_id": current_user.hospital_id,
        "hospital_name": hosp.name if hosp else "All Network Facilities",
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out", "user": current_user.email}
