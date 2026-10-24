import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.models import (
    BloodUnit,
    BloodRequest,
    RiskAlert,
    Hospital,
    DemandForecast
)
from app.config import settings

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
COMPONENTS = ["Whole Blood", "Red Blood Cells", "Platelets", "Plasma"]

def compute_shortage_risks(db: Session, hospital_id: int) -> List[RiskAlert]:
    """
    Computes shortage risks by comparing eligible stock vs 7-day projected demand
    and pending urgent requests.
    Clearly distinguishes rule-based threshold evaluation using ML demand inputs.
    """
    now = datetime.datetime.utcnow()
    alerts = []

    # Get active/eligible units grouped by blood group & component
    stock_counts = (
        db.query(
            BloodUnit.blood_group,
            BloodUnit.component_type,
            func.count(BloodUnit.id).label("eligible_count")
        )
        .filter(
            BloodUnit.hospital_id == hospital_id,
            BloodUnit.status == "Available",
            BloodUnit.is_reserved == False,
            BloodUnit.quality_screening_status == "Passed",
            BloodUnit.expiry_date > now
        )
        .group_by(BloodUnit.blood_group, BloodUnit.component_type)
        .all()
    )
    stock_map = {(r[0], r[1]): r[2] for r in stock_counts}

    # Get latest forecasts for hospital
    forecast_records = (
        db.query(DemandForecast)
        .filter(
            DemandForecast.hospital_id == hospital_id,
            DemandForecast.forecast_horizon_days == 7
        )
        .order_by(DemandForecast.forecast_date.desc())
        .all()
    )
    forecast_map = {}
    for f in forecast_records:
        key = (f.blood_group, f.component_type)
        if key not in forecast_map:
            forecast_map[key] = f.predicted_total_demand

    # Get pending emergency requests
    pending_emergency_requests = (
        db.query(BloodRequest)
        .filter(
            BloodRequest.requesting_hospital_id == hospital_id,
            BloodRequest.status.in_(["Pending", "Under_Review", "Partially_Fulfilled"]),
            BloodRequest.urgency_level.in_(["Emergency", "Urgent"])
        )
        .all()
    )
    emergency_shortage_keys = {(r.blood_group, r.component_type) for r in pending_emergency_requests}

    # Delete unacknowledged old shortage alerts for this hospital to avoid stale duplicates
    db.query(RiskAlert).filter(
        RiskAlert.hospital_id == hospital_id,
        RiskAlert.risk_type == "Shortage",
        RiskAlert.is_acknowledged == False
    ).delete()

    for bg in BLOOD_GROUPS:
        for comp in COMPONENTS:
            current_stock = stock_map.get((bg, comp), 0)
            expected_7d = forecast_map.get((bg, comp), 14.0)  # Default estimate if forecast missing
            daily_burn = max(0.5, expected_7d / 7.0)
            days_of_stock = current_stock / daily_burn
            stock_gap = max(0.0, expected_7d - current_stock)

            has_emergency = (bg, comp) in emergency_shortage_keys

            severity = None
            reason = ""
            action = ""

            if current_stock == 0 and has_emergency:
                severity = "Critical"
                reason = f"CRITICAL STOCKOUT: 0 units available while emergency request is pending. Expected 7-day demand is {expected_7d:.1f} units."
                action = "Initiate immediate inter-hospital emergency redistribution and alert donor coordinator."
            elif days_of_stock < 2.0 or (current_stock <= 2 and expected_7d > 5):
                severity = "Critical"
                reason = f"Severe deficit: Only {current_stock} units in stock ({days_of_stock:.1f} days of supply) against 7-day forecast of {expected_7d:.1f} units."
                action = "Trigger targeted donor drive for {bg} and request transfers from affiliated hospitals."
            elif days_of_stock < 4.0:
                severity = "High"
                reason = f"High Shortage Risk: {current_stock} units available ({days_of_stock:.1f} days of supply). Deficit of {stock_gap:.1f} units projected."
                action = "Reserve existing stock for surgical/trauma priority and review scheduled donation drives."
            elif days_of_stock < 6.0:
                severity = "Medium"
                reason = f"Moderate buffer: {current_stock} units on hand. Approaching safety buffer limit ({days_of_stock:.1f} days of supply)."
                action = "Monitor usage rate; prepare routine voluntary donation appeals."
            else:
                # Stock is healthy
                continue

            alert = RiskAlert(
                hospital_id=hospital_id,
                blood_group=bg,
                component_type=comp,
                risk_type="Shortage",
                severity=severity,
                current_stock=current_stock,
                expected_demand=round(expected_7d, 1),
                stock_gap=round(stock_gap, 1),
                reason=reason,
                recommended_action=action,
                is_acknowledged=False,
                created_at=now
            )
            db.add(alert)
            alerts.append(alert)

    db.commit()
    for a in alerts:
        db.refresh(a)
    return alerts
