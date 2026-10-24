import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import (
    BloodUnit,
    BloodRequest,
    Donation,
    RiskAlert,
    DemandForecast,
    Hospital,
    User
)
from app.schemas.schemas import DashboardSummaryResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard Intelligence"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    hospital_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_hospital_id = hospital_id
    if current_user.role != "SUPER_ADMIN":
        target_hospital_id = current_user.hospital_id

    now = datetime.datetime.utcnow()
    exp_window = now + datetime.timedelta(days=7)

    # 1. Total available units
    avail_q = db.query(func.count(BloodUnit.id)).filter(
        BloodUnit.status == "Available",
        BloodUnit.is_reserved == False,
        BloodUnit.quality_screening_status == "Passed",
        BloodUnit.expiry_date > now
    )
    if target_hospital_id:
        avail_q = avail_q.filter(BloodUnit.hospital_id == target_hospital_id)
    total_available = avail_q.scalar() or 0

    # 2. Units reserved
    res_q = db.query(func.count(BloodUnit.id)).filter(
        BloodUnit.is_reserved == True,
        BloodUnit.status == "Reserved"
    )
    if target_hospital_id:
        res_q = res_q.filter(BloodUnit.hospital_id == target_hospital_id)
    units_reserved = res_q.scalar() or 0

    # 3. Units approaching expiry (<= 7 days)
    exp_q = db.query(func.count(BloodUnit.id)).filter(
        BloodUnit.status == "Available",
        BloodUnit.expiry_date <= exp_window,
        BloodUnit.expiry_date > now
    )
    if target_hospital_id:
        exp_q = exp_q.filter(BloodUnit.hospital_id == target_hospital_id)
    units_expiring = exp_q.scalar() or 0

    # 4. Open emergency requests
    emg_q = db.query(func.count(BloodRequest.id)).filter(
        BloodRequest.status.in_(["Pending", "Under_Review", "Partially_Fulfilled"]),
        BloodRequest.urgency_level.in_(["Emergency", "Urgent"])
    )
    if target_hospital_id:
        emg_q = emg_q.filter(BloodRequest.requesting_hospital_id == target_hospital_id)
    open_emergencies = emg_q.scalar() or 0

    # 5. Shortage risk alerts count
    risk_q = db.query(func.count(RiskAlert.id)).filter(
        RiskAlert.risk_type == "Shortage",
        RiskAlert.severity.in_(["High", "Critical"])
    )
    if target_hospital_id:
        risk_q = risk_q.filter(RiskAlert.hospital_id == target_hospital_id)
    shortage_groups_count = risk_q.scalar() or 0

    # 6. Predicted 7-day demand sum
    f_q = db.query(func.sum(DemandForecast.predicted_total_demand)).filter(
        DemandForecast.forecast_horizon_days == 7
    )
    if target_hospital_id:
        f_q = f_q.filter(DemandForecast.hospital_id == target_hospital_id)
    predicted_7d = float(f_q.scalar() or 48.5)

    # 7. Stock by blood group
    all_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    bg_q = db.query(
        BloodUnit.blood_group,
        func.count(BloodUnit.id)
    ).filter(
        BloodUnit.status == "Available",
        BloodUnit.expiry_date > now
    )
    if target_hospital_id:
        bg_q = bg_q.filter(BloodUnit.hospital_id == target_hospital_id)
    bg_counts = dict(bg_q.group_by(BloodUnit.blood_group).all())
    stock_by_bg = {bg: bg_counts.get(bg, 0) for bg in all_groups}

    # 8. Stock by component
    all_comps = ["Whole Blood", "Red Blood Cells", "Platelets", "Plasma"]
    comp_q = db.query(
        BloodUnit.component_type,
        func.count(BloodUnit.id)
    ).filter(
        BloodUnit.status == "Available",
        BloodUnit.expiry_date > now
    )
    if target_hospital_id:
        comp_q = comp_q.filter(BloodUnit.hospital_id == target_hospital_id)
    comp_counts = dict(comp_q.group_by(BloodUnit.component_type).all())
    stock_by_comp = {comp: comp_counts.get(comp, 0) for comp in all_comps}

    # 9. Demand vs Stock chart data
    demand_vs_stock = []
    for bg in all_groups:
        curr_stock = stock_by_bg.get(bg, 0)
        # Approximate 7d demand per group
        bg_pred = round(curr_stock * 0.9 + 3.2, 1)
        demand_vs_stock.append({
            "blood_group": bg,
            "current_stock": curr_stock,
            "forecasted_demand": bg_pred,
            "safety_threshold": round(bg_pred * 0.8, 1)
        })

    # 10. Expiry risk summary
    exp_summary_rows = db.query(
        BloodUnit.blood_group,
        BloodUnit.component_type,
        func.count(BloodUnit.id).label("count")
    ).filter(
        BloodUnit.status == "Available",
        BloodUnit.expiry_date <= exp_window,
        BloodUnit.expiry_date > now
    )
    if target_hospital_id:
        exp_summary_rows = exp_summary_rows.filter(BloodUnit.hospital_id == target_hospital_id)
    exp_summary = [
        {"blood_group": r[0], "component_type": r[1], "units_expiring": r[2]}
        for r in exp_summary_rows.group_by(BloodUnit.blood_group, BloodUnit.component_type).all()
    ]

    # 11. Recent donations
    don_q = db.query(Donation).order_by(Donation.donation_date.desc()).limit(5)
    if target_hospital_id:
        don_q = don_q.filter(Donation.hospital_id == target_hospital_id)
    recent_donations = [
        {
            "id": d.id,
            "donation_code": d.donation_code,
            "blood_group": d.blood_group,
            "component_type": d.component_type,
            "screening_status": d.screening_status,
            "date": d.donation_date.strftime("%b %d, %H:%M")
        }
        for d in don_q.all()
    ]

    # 12. Recent emergency requests
    emg_requests_q = db.query(BloodRequest).filter(
        BloodRequest.urgency_level.in_(["Emergency", "Urgent"])
    ).order_by(BloodRequest.created_at.desc()).limit(5)
    if target_hospital_id:
        emg_requests_q = emg_requests_q.filter(BloodRequest.requesting_hospital_id == target_hospital_id)
    recent_emergencies = [
        {
            "id": r.id,
            "request_code": r.request_code,
            "patient_ref": r.patient_ref,
            "blood_group": r.blood_group,
            "units_requested": r.units_requested,
            "urgency_level": r.urgency_level,
            "status": r.status,
            "required_by": r.required_by.strftime("%b %d, %H:%M")
        }
        for r in emg_requests_q.all()
    ]

    # 13. Top AI insights
    insights = [
        {
            "category": "Shortage Early Warning",
            "title": "O- Red Blood Cells Supply Deficit",
            "message": "Only 3 units of O- RBC available against 7-day projected demand of 8.2 units. Critical deficit expected in 48 hours.",
            "urgency": "High",
            "recommended_action": "Review partner hospital redistribution or activate targeted O- donor alert."
        },
        {
            "category": "Waste Reduction Alert",
            "title": "Platelets Shelf-Life Alert",
            "message": "2 units of A+ Platelets will expire in 44 hours. Current utilization is below safe burn velocity.",
            "urgency": "Medium",
            "recommended_action": "Move units to primary surgical rotation or evaluate regional transfer to trauma center."
        },
        {
            "category": "Inter-Hospital Redistribution",
            "title": "St. Jude Memorial Surplus",
            "message": "St. Jude Memorial has 14 units of B+ RBC with low projected demand. Transferring 3 units balances network safety.",
            "urgency": "Low",
            "recommended_action": "Inspect proposed Transfer Recommendation in the AI Command Center."
        }
    ]

    return DashboardSummaryResponse(
        total_available_units=total_available,
        units_reserved=units_reserved,
        units_approaching_expiry=units_expiring,
        open_emergency_requests=open_emergencies,
        shortage_risk_groups_count=shortage_groups_count,
        predicted_7d_demand=predicted_7d,
        dataset_mode="Simulated / Demonstration",
        stock_by_blood_group=stock_by_bg,
        stock_by_component=stock_by_comp,
        demand_vs_stock=demand_vs_stock,
        expiry_risk_summary=exp_summary,
        recent_donations=recent_donations,
        recent_emergency_requests=recent_emergencies,
        ai_top_insights=insights
    )
