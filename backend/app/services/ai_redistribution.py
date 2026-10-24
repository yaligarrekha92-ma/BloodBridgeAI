import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import (
    BloodUnit,
    Hospital,
    TransferRecommendation,
    BloodTransfer,
    BloodRequest,
    DemandForecast,
    User,
    AuditLog
)

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
COMPONENTS = ["Whole Blood", "Red Blood Cells", "Platelets", "Plasma"]

def generate_redistribution_recommendations(db: Session) -> List[TransferRecommendation]:
    """
    Analyzes inter-hospital network to identify paired surplus-deficit opportunities.
    Guarantees:
    1. Source hospital keeps adequate reserve buffer (never creates a secondary shortage).
    2. Units transferred have safe remaining shelf-life (>= 5 days).
    3. Transparent rationale with clinical demand evidence.
    """
    now = datetime.datetime.utcnow()
    safe_expiry_threshold = now + datetime.timedelta(days=5)

    hospitals = db.query(Hospital).all()
    if len(hospitals) < 2:
        return []

    # Map current eligible stock per (hospital_id, blood_group, component_type)
    stock_rows = (
        db.query(
            BloodUnit.hospital_id,
            BloodUnit.blood_group,
            BloodUnit.component_type,
            func.count(BloodUnit.id).label("stock")
        )
        .filter(
            BloodUnit.status == "Available",
            BloodUnit.is_reserved == False,
            BloodUnit.quality_screening_status == "Passed",
            BloodUnit.expiry_date > safe_expiry_threshold
        )
        .group_by(BloodUnit.hospital_id, BloodUnit.blood_group, BloodUnit.component_type)
        .all()
    )
    stock_dict = {(r[0], r[1], r[2]): r[3] for r in stock_rows}

    # Map demand forecasts
    forecast_rows = (
        db.query(
            DemandForecast.hospital_id,
            DemandForecast.blood_group,
            DemandForecast.component_type,
            DemandForecast.predicted_total_demand
        )
        .filter(DemandForecast.forecast_horizon_days == 7)
        .all()
    )
    forecast_dict = {(r[0], r[1], r[2]): r[3] for r in forecast_rows}

    # Map urgent pending requests
    urgent_reqs = (
        db.query(
            BloodRequest.requesting_hospital_id,
            BloodRequest.blood_group,
            BloodRequest.component_type,
            func.sum(BloodRequest.units_requested - BloodRequest.units_allocated).label("needed")
        )
        .filter(
            BloodRequest.status.in_(["Pending", "Under_Review", "Partially_Fulfilled"]),
            BloodRequest.urgency_level.in_(["Emergency", "Urgent"])
        )
        .group_by(BloodRequest.requesting_hospital_id, BloodRequest.blood_group, BloodRequest.component_type)
        .all()
    )
    urgent_dict = {(r[0], r[1], r[2]): r[3] for r in urgent_reqs}

    recommendations = []

    for bg in BLOOD_GROUPS:
        for comp in COMPONENTS:
            surplus_hospitals = []
            deficit_hospitals = []

            for h in hospitals:
                stock = stock_dict.get((h.id, bg, comp), 0)
                demand = forecast_dict.get((h.id, bg, comp), 10.0)
                urgent_need = urgent_dict.get((h.id, bg, comp), 0)

                burn = max(0.5, demand / 7.0)
                days_supply = stock / burn

                # Deficit condition: days of supply < 3.0 or urgent need with insufficient stock
                if days_supply < 3.0 or (urgent_need > 0 and stock < urgent_need):
                    deficit_hospitals.append({
                        "hospital": h,
                        "stock": stock,
                        "demand": demand,
                        "days_supply": days_supply,
                        "urgent_need": urgent_need,
                        "target_buffer": int(demand * 0.7)  # want at least 70% of 7d demand
                    })
                # Surplus condition: days of supply >= 6.5 and stock >= 8
                elif days_supply >= 6.0 and stock >= 6:
                    surplus_hospitals.append({
                        "hospital": h,
                        "stock": stock,
                        "demand": demand,
                        "days_supply": days_supply,
                        "safe_excess": int(stock - (demand * 0.9))  # ensure source retains >= 90% of demand
                    })

            # Pair surplus with deficit
            for def_info in deficit_hospitals:
                for sur_info in surplus_hospitals:
                    if sur_info["safe_excess"] >= 2:
                        transfer_qty = min(sur_info["safe_excess"], 4)
                        dest_h = def_info["hospital"]
                        src_h = sur_info["hospital"]

                        # Check if a recent recommendation already exists for this pair
                        existing = db.query(TransferRecommendation).filter(
                            TransferRecommendation.source_hospital_id == src_h.id,
                            TransferRecommendation.destination_hospital_id == dest_h.id,
                            TransferRecommendation.blood_group == bg,
                            TransferRecommendation.component_type == comp,
                            TransferRecommendation.status.in_(["Proposed", "Approved", "In_Transit"])
                        ).first()

                        if existing:
                            continue

                        urgent_snippet = f" with {def_info['urgent_need']} urgent units requested" if def_info['urgent_need'] else ""
                        reason = (
                            f"Network Optimization: {src_h.name} has {sur_info['stock']} units ({sur_info['days_supply']:.1f} days supply vs 7d demand of {sur_info['demand']:.1f}). "
                            f"{dest_h.name} is at {def_info['stock']} units ({def_info['days_supply']:.1f} days supply{urgent_snippet}). "
                            f"Proposed transfer of {transfer_qty} units balances regional reserves without jeopardizing source facility."
                        )

                        rec = TransferRecommendation(
                            source_hospital_id=src_h.id,
                            destination_hospital_id=dest_h.id,
                            blood_group=bg,
                            component_type=comp,
                            suggested_units=transfer_qty,
                            source_stock_before=sur_info["stock"],
                            source_stock_after=sur_info["stock"] - transfer_qty,
                            dest_stock_before=def_info["stock"],
                            dest_stock_after=def_info["stock"] + transfer_qty,
                            reason=reason,
                            risk_mitigated="Imminent Shortage & Regional Inventory Balancing",
                            status="Proposed",
                            generated_at=now
                        )
                        db.add(rec)
                        recommendations.append(rec)
                        # Deduct from available safe excess for subsequent loops
                        sur_info["safe_excess"] -= transfer_qty
                        break

    db.commit()
    for r in recommendations:
        db.refresh(r)
    return recommendations

def review_transfer_recommendation(
    db: Session,
    recommendation_id: int,
    action: str,
    user: User,
    notes: Optional[str] = None
) -> TransferRecommendation:
    rec = db.query(TransferRecommendation).filter(TransferRecommendation.id == recommendation_id).first()
    if not rec:
        raise ValueError("Transfer recommendation not found")

    now = datetime.datetime.utcnow()
    if action.lower() == "approve":
        rec.status = "Approved"
        rec.approved_by_user_id = user.id
        rec.approved_at = now

        # Create corresponding formal BloodTransfer tracking record
        ts_code = int(now.timestamp()) % 100000
        transfer = BloodTransfer(
            transfer_code=f"TRF-{rec.blood_group.replace('+', 'P').replace('-', 'N')}-{ts_code}",
            recommendation_id=rec.id,
            source_hospital_id=rec.source_hospital_id,
            destination_hospital_id=rec.destination_hospital_id,
            blood_group=rec.blood_group,
            component_type=rec.component_type,
            units_count=rec.suggested_units,
            status="Scheduled",
            dispatch_time=now + datetime.timedelta(hours=2),
            estimated_arrival=now + datetime.timedelta(hours=5),
            carrier_info="MediExpress Cold-Chain Logistics #TX-409"
        )
        db.add(transfer)

        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            hospital_id=rec.source_hospital_id,
            action="APPROVE_TRANSFER_RECOMMENDATION",
            resource_type="TransferRecommendation",
            resource_id=str(rec.id),
            details=f"Approved transfer of {rec.suggested_units} units ({rec.blood_group} {rec.component_type}) to Hospital #{rec.destination_hospital_id}"
        )
        db.add(audit)
    else:
        rec.status = "Rejected"
        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            hospital_id=rec.source_hospital_id,
            action="REJECT_TRANSFER_RECOMMENDATION",
            resource_type="TransferRecommendation",
            resource_id=str(rec.id),
            details=f"Rejected recommendation #{rec.id}. Notes: {notes or 'No reason provided'}"
        )
        db.add(audit)

    db.commit()
    db.refresh(rec)
    return rec
