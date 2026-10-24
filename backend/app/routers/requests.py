import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import BloodRequest, BloodUnit, Hospital, User, AuditLog
from app.schemas.schemas import (
    BloodRequestResponse,
    BloodRequestCreate,
    RequestApprove,
    RequestFulfill,
    CompatibilityCheckResponse
)
from app.services.auth_service import get_current_user, require_roles, verify_hospital_access
from app.services.compatibility_service import check_compatibility
from app.services.inventory_service import get_eligible_units, reserve_blood_unit, issue_blood_unit
from app.services.notification_service import create_notification

router = APIRouter(prefix="/requests", tags=["Blood Requests & Emergency"])

@router.get("", response_model=List[BloodRequestResponse])
def list_requests(
    hospital_id: Optional[int] = Query(None),
    urgency_level: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BloodRequest).join(Hospital, BloodRequest.requesting_hospital_id == Hospital.id)

    effective_hospital_id = hospital_id
    if current_user.role != "SUPER_ADMIN":
        if hospital_id and hospital_id != current_user.hospital_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        effective_hospital_id = current_user.hospital_id

    if effective_hospital_id:
        query = query.filter(BloodRequest.requesting_hospital_id == effective_hospital_id)
    if urgency_level:
        query = query.filter(BloodRequest.urgency_level == urgency_level)
    if status_filter:
        query = query.filter(BloodRequest.status == status_filter)

    reqs = query.order_by(
        # Urgent/Emergency requests float to top
        BloodRequest.urgency_level.desc(),
        BloodRequest.created_at.desc()
    ).offset(offset).limit(limit).all()

    results = []
    for r in reqs:
        results.append(BloodRequestResponse(
            id=r.id,
            request_code=r.request_code,
            requesting_hospital_id=r.requesting_hospital_id,
            patient_ref=r.patient_ref,
            blood_group=r.blood_group,
            component_type=r.component_type,
            units_requested=r.units_requested,
            units_allocated=r.units_allocated,
            urgency_level=r.urgency_level,
            status=r.status,
            requested_at=r.requested_at,
            required_by=r.required_by,
            compatibility_verified=r.compatibility_verified,
            staff_notes=r.staff_notes,
            created_at=r.created_at,
            hospital_name=r.hospital.name if r.hospital else None
        ))
    return results

@router.post("", response_model=BloodRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_request(
    payload: BloodRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_hospital_access(current_user, payload.requesting_hospital_id):
        raise HTTPException(status_code=403, detail="Cannot submit blood requests for other hospitals")

    now = datetime.datetime.utcnow()
    ts_code = int(now.timestamp()) % 100000
    clean_grp = payload.blood_group.replace("+", "P").replace("-", "N")
    request_code = f"REQ-{clean_grp}-{ts_code}"

    # Clinical check: Verify self-compatibility as baseline check
    compat_result = check_compatibility(
        donor_group=payload.blood_group,
        recipient_group=payload.blood_group,
        component_type=payload.component_type
    )

    req = BloodRequest(
        request_code=request_code,
        requesting_hospital_id=payload.requesting_hospital_id,
        patient_ref=payload.patient_ref,
        blood_group=payload.blood_group,
        component_type=payload.component_type,
        units_requested=payload.units_requested,
        units_allocated=0,
        urgency_level=payload.urgency_level,
        status="Pending",
        requested_at=now,
        required_by=payload.required_by,
        compatibility_verified=compat_result["compatible"],
        staff_notes=payload.staff_notes
    )
    db.add(req)
    db.flush()

    # Trigger critical notification if Emergency
    if payload.urgency_level in ["Emergency", "Urgent"]:
        hosp = db.query(Hospital).filter(Hospital.id == payload.requesting_hospital_id).first()
        hosp_name = hosp.name if hosp else f"Hospital #{payload.requesting_hospital_id}"
        create_notification(
            db=db,
            title=f"EMERGENCY REQUEST: {payload.blood_group} {payload.component_type}",
            message=f"{payload.urgency_level.upper()} request for {payload.units_requested} units at {hosp_name} (Patient: {payload.patient_ref})",
            severity="Critical" if payload.urgency_level == "Emergency" else "Warning",
            notification_type="Request",
            hospital_id=payload.requesting_hospital_id,
            related_link=f"/requests"
        )

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        hospital_id=payload.requesting_hospital_id,
        action="CREATE_BLOOD_REQUEST",
        resource_type="BloodRequest",
        resource_id=str(req.id),
        details=f"Submitted {payload.urgency_level} request {req.request_code} for {payload.units_requested} units of {payload.blood_group}"
    )
    db.add(audit)
    db.commit()
    db.refresh(req)

    return BloodRequestResponse(
        id=req.id,
        request_code=req.request_code,
        requesting_hospital_id=req.requesting_hospital_id,
        patient_ref=req.patient_ref,
        blood_group=req.blood_group,
        component_type=req.component_type,
        units_requested=req.units_requested,
        units_allocated=req.units_allocated,
        urgency_level=req.urgency_level,
        status=req.status,
        requested_at=req.requested_at,
        required_by=req.required_by,
        compatibility_verified=req.compatibility_verified,
        staff_notes=req.staff_notes,
        created_at=req.created_at,
        hospital_name=hosp.name if hosp else None
    )

@router.post("/{request_id}/approve")
def approve_request(
    request_id: int,
    payload: RequestApprove,
    auto_reserve_inventory: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not verify_hospital_access(current_user, req.requesting_hospital_id):
        raise HTTPException(status_code=403, detail="Unauthorized")

    req.status = "Under_Review"
    if payload.staff_notes:
        req.staff_notes = f"{req.staff_notes or ''}\n[Approved]: {payload.staff_notes}"

    reserved_count = 0
    if auto_reserve_inventory:
        eligible_units = get_eligible_units(
            db=db,
            hospital_id=req.requesting_hospital_id,
            blood_group=req.blood_group,
            component_type=req.component_type,
            required_count=req.units_requested
        )
        for unit in eligible_units:
            try:
                reserve_blood_unit(db, unit.id, req.id, current_user, "Auto-reserved on request approval")
                reserved_count += 1
            except Exception:
                pass

    db.commit()
    return {
        "message": f"Request {req.request_code} approved",
        "status": req.status,
        "units_reserved": reserved_count
    }

@router.post("/{request_id}/fulfill")
def fulfill_request(
    request_id: int,
    payload: RequestFulfill,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "BLOOD_BANK_STAFF"))
):
    req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if not verify_hospital_access(current_user, req.requesting_hospital_id):
        raise HTTPException(status_code=403, detail="Unauthorized")

    issued_units = []
    for unit_id in payload.unit_ids:
        unit = db.query(BloodUnit).filter(BloodUnit.id == unit_id).first()
        if not unit:
            continue

        # Transfusion Compatibility Verification
        compat = check_compatibility(
            donor_group=unit.blood_group,
            recipient_group=req.blood_group,
            component_type=req.component_type
        )
        if not compat["compatible"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CLINICAL SAFETY STOP: Unit {unit.unit_number} ({unit.blood_group}) is INCOMPATIBLE with recipient {req.blood_group} ({req.component_type}). {compat['clinical_explanation']}"
            )

        issued = issue_blood_unit(
            db=db,
            unit_id=unit.id,
            user=current_user,
            request_id=req.id,
            patient_ref=req.patient_ref,
            notes=payload.notes
        )
        issued_units.append(issued.unit_number)

    db.commit()
    db.refresh(req)
    return {
        "message": f"Fulfillment processed for request {req.request_code}",
        "request_status": req.status,
        "units_issued": issued_units,
        "units_allocated": req.units_allocated,
        "units_requested": req.units_requested
    }

@router.get("/compatibility-check", response_model=CompatibilityCheckResponse)
def run_compatibility_check(
    donor_group: str = Query(..., description="Donor blood group, e.g. O-"),
    recipient_group: str = Query(..., description="Recipient blood group, e.g. A+"),
    component_type: str = Query("Red Blood Cells", description="Whole Blood, Red Blood Cells, Platelets, Plasma")
):
    result = check_compatibility(
        donor_group=donor_group,
        recipient_group=recipient_group,
        component_type=component_type
    )
    return CompatibilityCheckResponse(**result)
