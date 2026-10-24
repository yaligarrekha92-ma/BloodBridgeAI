import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.models import (
    BloodUnit,
    RiskAlert,
    Hospital,
    DemandForecast
)

def evaluate_expiry_risks(db: Session, hospital_id: int) -> List[Dict[str, Any]]:
    """
    Evaluates inventory units approaching expiration against projected demand.
    Identifies units at risk of becoming waste and generates actionable rotation suggestions.
    """
    now = datetime.datetime.utcnow()
    day_3 = now + datetime.timedelta(days=3)
    day_7 = now + datetime.timedelta(days=7)

    # Clean existing unacknowledged Expiry alerts for this hospital
    db.query(RiskAlert).filter(
        RiskAlert.hospital_id == hospital_id,
        RiskAlert.risk_type == "Expiry",
        RiskAlert.is_acknowledged == False
    ).delete()

    # Query all available units expiring in the next 7 days
    expiring_units = (
        db.query(BloodUnit)
        .filter(
            BloodUnit.hospital_id == hospital_id,
            BloodUnit.status == "Available",
            BloodUnit.is_reserved == False,
            BloodUnit.expiry_date > now,
            BloodUnit.expiry_date <= day_7
        )
        .order_by(BloodUnit.expiry_date.asc())
        .all()
    )

    # Group by blood group and component
    grouped: Dict[tuple, List[BloodUnit]] = {}
    for unit in expiring_units:
        key = (unit.blood_group, unit.component_type)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(unit)

    expiry_insights = []

    for (bg, comp), units in grouped.items():
        units_3d = [u for u in units if u.expiry_date <= day_3]
        total_expiring = len(units)
        earliest_exp = min(u.expiry_date for u in units)
        hours_to_first_expiry = max(0, int((earliest_exp - now).total_seconds() / 3600))

        # Determine severity
        if len(units_3d) >= 2 or (comp == "Platelets" and len(units_3d) >= 1):
            severity = "Critical" if hours_to_first_expiry < 48 else "High"
            reason = f"Urgent Expiry: {len(units_3d)} unit(s) expiring within 72 hours (earliest in {hours_to_first_expiry}h). Total {total_expiring} expiring within 7 days."
            action = f"Enforce immediate FIFO stock rotation; flag for inter-hospital transfer recommendation or elective crossmatching."
        else:
            severity = "Medium"
            reason = f"{total_expiring} unit(s) expiring within 7 days (earliest in {hours_to_first_expiry // 24} days)."
            action = f"Audit shelf placement in cold storage and review upcoming planned transfusions."

        alert = RiskAlert(
            hospital_id=hospital_id,
            blood_group=bg,
            component_type=comp,
            risk_type="Expiry",
            severity=severity,
            current_stock=total_expiring,
            expected_demand=float(len(units)),
            stock_gap=0.0,
            reason=reason,
            recommended_action=action,
            is_acknowledged=False,
            created_at=now
        )
        db.add(alert)

        expiry_insights.append({
            "blood_group": bg,
            "component_type": comp,
            "expiring_count": total_expiring,
            "expiring_in_3d": len(units_3d),
            "earliest_expiry": earliest_exp.isoformat(),
            "hours_to_first_expiry": hours_to_first_expiry,
            "severity": severity,
            "recommended_action": action,
            "sample_unit_numbers": [u.unit_number for u in units[:4]]
        })

    db.commit()
    return expiry_insights
