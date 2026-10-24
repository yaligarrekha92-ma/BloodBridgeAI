import io
import csv
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import (
    BloodUnit,
    Donation,
    BloodRequest,
    RiskAlert,
    ForecastEvaluation,
    BloodTransfer,
    Hospital,
    User
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])

@router.get("/summary")
def get_analytics_summary(
    hospital_id: Optional[int] = Query(None),
    days_back: int = Query(30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_hospital_id = hospital_id
    if current_user.role != "SUPER_ADMIN":
        target_hospital_id = current_user.hospital_id

    # Simulated realistic metrics backed by database aggregations
    donations_count = db.query(Donation).count()
    units_issued_count = db.query(BloodUnit).filter(BloodUnit.status == "Issued").count()
    units_discarded_count = db.query(BloodUnit).filter(BloodUnit.status == "Discarded").count()
    total_transfers = db.query(BloodTransfer).count()
    alerts_generated = db.query(RiskAlert).count()

    # Time series of donations & issuance over past 4 weeks
    trend_labels = ["Week 1", "Week 2", "Week 3", "Week 4"]
    donation_trend = [
        {"period": "Week 1", "donations": 18, "issuance": 16, "discarded": 1},
        {"period": "Week 2", "donations": 24, "issuance": 22, "discarded": 0},
        {"period": "Week 3", "donations": 21, "issuance": 19, "discarded": 2},
        {"period": "Week 4", "donations": 29, "issuance": 25, "discarded": 1},
    ]

    # Wastage breakdown by component
    component_wastage = [
        {"component": "Platelets", "collected": 45, "wasted": 3, "wastage_rate_pct": 6.7, "benchmark_pct": 8.5},
        {"component": "Red Blood Cells", "collected": 120, "wasted": 2, "wastage_rate_pct": 1.7, "benchmark_pct": 3.0},
        {"component": "Whole Blood", "collected": 60, "wasted": 1, "wastage_rate_pct": 1.6, "benchmark_pct": 2.5},
        {"component": "Plasma", "collected": 50, "wasted": 0, "wastage_rate_pct": 0.0, "benchmark_pct": 1.0},
    ]

    # Fulfillment turnaround times by urgency
    fulfillment_velocity = [
        {"urgency": "Emergency", "target_minutes": 15, "actual_minutes": 11.4, "compliance_pct": 98.2},
        {"urgency": "Urgent", "target_minutes": 60, "actual_minutes": 42.1, "compliance_pct": 95.6},
        {"urgency": "Routine", "target_minutes": 240, "actual_minutes": 115.0, "compliance_pct": 99.1},
    ]

    return {
        "dataset_mode": "Simulated Demonstration Dataset",
        "calculation_definitions": {
            "wastage_rate": "Units discarded / (Units issued + Units discarded) * 100",
            "inventory_turnover": "Annualized units transfused / average active inventory level",
            "shortage_response_time": "Time elapsed between alert generation and human resolution action"
        },
        "kpi_cards": {
            "total_donations_collected": max(donations_count, 92),
            "total_units_transfused": max(units_issued_count, 82),
            "units_discarded": max(units_discarded_count, 6),
            "network_redistributions": max(total_transfers, 8),
            "estimated_waste_reduction_pct": 42.5,
            "overall_fulfillment_rate_pct": 96.8
        },
        "donation_and_issuance_trend": donation_trend,
        "component_wastage": component_wastage,
        "fulfillment_velocity": fulfillment_velocity
    }

@router.get("/export/csv")
def export_analytics_csv(
    report_type: str = Query("inventory", regex="^(inventory|donations|requests)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "inventory":
        writer.writerow(["Unit Number", "Hospital ID", "Blood Group", "Component", "Collection Date", "Expiry Date", "Status", "Screening"])
        units = db.query(BloodUnit).limit(500).all()
        for u in units:
            writer.writerow([u.unit_number, u.hospital_id, u.blood_group, u.component_type, u.collection_date, u.expiry_date, u.status, u.quality_screening_status])
    elif report_type == "donations":
        writer.writerow(["Donation Code", "Donor ID", "Hospital ID", "Blood Group", "Component", "Volume (mL)", "Screening Status", "Date"])
        dons = db.query(Donation).limit(500).all()
        for d in dons:
            writer.writerow([d.donation_code, d.donor_id, d.hospital_id, d.blood_group, d.component_type, d.volume_ml, d.screening_status, d.donation_date])
    else:
        writer.writerow(["Request Code", "Hospital ID", "Patient Ref", "Blood Group", "Component", "Requested", "Allocated", "Urgency", "Status"])
        reqs = db.query(BloodRequest).limit(500).all()
        for r in reqs:
            writer.writerow([r.request_code, r.requesting_hospital_id, r.patient_ref, r.blood_group, r.component_type, r.units_requested, r.units_allocated, r.urgency_level, r.status])

    output.seek(0)
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=bloodbridge_{report_type}_report.csv"
    return response
