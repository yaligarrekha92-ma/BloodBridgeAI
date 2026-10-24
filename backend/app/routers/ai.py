import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    DemandForecast,
    ForecastEvaluation,
    RiskAlert,
    TransferRecommendation,
    Hospital,
    User
)
from app.schemas.schemas import (
    DemandForecastResponse,
    ForecastGenerationRequest,
    ForecastEvaluationResponse,
    RiskAlertResponse,
    TransferRecommendationResponse,
    TransferReviewRequest,
    AlertAcknowledgeRequest
)
from app.services.auth_service import get_current_user, require_roles, verify_hospital_access
from app.services.ai_forecasting import generate_forecasts
from app.services.ai_shortage import compute_shortage_risks
from app.services.ai_expiry import evaluate_expiry_risks
from app.services.ai_redistribution import (
    generate_redistribution_recommendations,
    review_transfer_recommendation
)

router = APIRouter(prefix="/ai", tags=["BloodBridge AI Intelligence Engine"])

# ----------------- Forecasts -----------------
@router.get("/forecasts", response_model=List[DemandForecastResponse])
def get_forecasts(
    hospital_id: Optional[int] = Query(None),
    blood_group: Optional[str] = Query(None),
    component_type: Optional[str] = Query(None),
    horizon_days: int = Query(7),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_hospital_id = hospital_id or current_user.hospital_id or 1
    query = db.query(DemandForecast).filter(
        DemandForecast.hospital_id == target_hospital_id,
        DemandForecast.forecast_horizon_days == horizon_days
    )
    if blood_group:
        query = query.filter(DemandForecast.blood_group == blood_group)
    if component_type:
        query = query.filter(DemandForecast.component_type == component_type)

    forecasts = query.order_by(DemandForecast.forecast_date.desc()).all()

    # If no forecasts exist yet for this combination, generate them on the fly
    if not forecasts:
        forecasts = generate_forecasts(
            db=db,
            hospital_id=target_hospital_id,
            horizon_days=horizon_days,
            blood_group=blood_group,
            component_type=component_type
        )

    results = []
    for f in forecasts:
        daily_list = json.loads(f.predicted_daily_demand) if isinstance(f.predicted_daily_demand, str) else f.predicted_daily_demand
        results.append(DemandForecastResponse(
            id=f.id,
            hospital_id=f.hospital_id,
            hospital_name=f.hospital_id and db.query(Hospital).filter(Hospital.id == f.hospital_id).first().name,
            blood_group=f.blood_group,
            component_type=f.component_type,
            forecast_horizon_days=f.forecast_horizon_days,
            forecast_date=f.forecast_date,
            predicted_daily_demand=daily_list,
            predicted_total_demand=f.predicted_total_demand,
            confidence_lower=f.confidence_lower,
            confidence_upper=f.confidence_upper,
            model_version=f.model_version,
            is_baseline=f.is_baseline,
            created_at=f.created_at
        ))
    return results

@router.post("/forecasts/generate", response_model=List[DemandForecastResponse])
def trigger_forecast_generation(
    payload: ForecastGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "READ_ONLY_ANALYST"))
):
    target_hospital_id = payload.hospital_id or current_user.hospital_id or 1
    forecasts = generate_forecasts(
        db=db,
        hospital_id=target_hospital_id,
        horizon_days=payload.horizon_days,
        blood_group=payload.blood_group,
        component_type=payload.component_type
    )
    results = []
    for f in forecasts:
        daily_list = json.loads(f.predicted_daily_demand) if isinstance(f.predicted_daily_demand, str) else f.predicted_daily_demand
        results.append(DemandForecastResponse(
            id=f.id,
            hospital_id=f.hospital_id,
            hospital_name=db.query(Hospital).filter(Hospital.id == f.hospital_id).first().name,
            blood_group=f.blood_group,
            component_type=f.component_type,
            forecast_horizon_days=f.forecast_horizon_days,
            forecast_date=f.forecast_date,
            predicted_daily_demand=daily_list,
            predicted_total_demand=f.predicted_total_demand,
            confidence_lower=f.confidence_lower,
            confidence_upper=f.confidence_upper,
            model_version=f.model_version,
            is_baseline=f.is_baseline,
            created_at=f.created_at
        ))
    return results

@router.get("/forecasts/evaluation", response_model=List[ForecastEvaluationResponse])
def get_forecast_evaluations(
    blood_group: Optional[str] = Query(None),
    component_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ForecastEvaluation)
    if blood_group:
        query = query.filter(ForecastEvaluation.blood_group == blood_group)
    if component_type:
        query = query.filter(ForecastEvaluation.component_type == component_type)

    evals = query.order_by(ForecastEvaluation.evaluation_date.desc()).limit(50).all()
    return evals

# ----------------- Shortage Risks -----------------
@router.get("/shortage-risks", response_model=List[RiskAlertResponse])
def get_shortage_risks(
    hospital_id: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    refresh: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_hospital_id = hospital_id or current_user.hospital_id or 1
    if refresh:
        compute_shortage_risks(db, target_hospital_id)

    query = db.query(RiskAlert).filter(
        RiskAlert.hospital_id == target_hospital_id,
        RiskAlert.risk_type == "Shortage"
    )
    if severity:
        query = query.filter(RiskAlert.severity == severity)

    alerts = query.order_by(RiskAlert.created_at.desc()).all()
    if not alerts and not refresh:
        alerts = compute_shortage_risks(db, target_hospital_id)

    hosp = db.query(Hospital).filter(Hospital.id == target_hospital_id).first()
    hosp_name = hosp.name if hosp else None

    results = []
    for a in alerts:
        results.append(RiskAlertResponse(
            id=a.id,
            hospital_id=a.hospital_id,
            hospital_name=hosp_name,
            blood_group=a.blood_group,
            component_type=a.component_type,
            risk_type=a.risk_type,
            severity=a.severity,
            current_stock=a.current_stock,
            expected_demand=a.expected_demand,
            stock_gap=a.stock_gap,
            reason=a.reason,
            recommended_action=a.recommended_action,
            is_acknowledged=a.is_acknowledged,
            acknowledged_at=a.acknowledged_at,
            created_at=a.created_at
        ))
    return results

# ----------------- Expiry Risks -----------------
@router.get("/expiry-risks")
def get_expiry_risks(
    hospital_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_hospital_id = hospital_id or current_user.hospital_id or 1
    insights = evaluate_expiry_risks(db, target_hospital_id)
    return {
        "hospital_id": target_hospital_id,
        "evaluated_at": datetime.datetime.utcnow().isoformat(),
        "total_at_risk_groups": len(insights),
        "insights": insights
    }

# ----------------- Inter-Hospital Redistribution -----------------
@router.get("/redistribution-recommendations", response_model=List[TransferRecommendationResponse])
def get_redistribution_recommendations(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TransferRecommendation)
    if status_filter:
        query = query.filter(TransferRecommendation.status == status_filter)

    recs = query.order_by(TransferRecommendation.generated_at.desc()).all()
    if not recs:
        recs = generate_redistribution_recommendations(db)

    results = []
    for r in recs:
        src = db.query(Hospital).filter(Hospital.id == r.source_hospital_id).first()
        dest = db.query(Hospital).filter(Hospital.id == r.destination_hospital_id).first()
        results.append(TransferRecommendationResponse(
            id=r.id,
            source_hospital_id=r.source_hospital_id,
            source_hospital_name=src.name if src else None,
            destination_hospital_id=r.destination_hospital_id,
            destination_hospital_name=dest.name if dest else None,
            blood_group=r.blood_group,
            component_type=r.component_type,
            suggested_units=r.suggested_units,
            source_stock_before=r.source_stock_before,
            source_stock_after=r.source_stock_after,
            dest_stock_before=r.dest_stock_before,
            dest_stock_after=r.dest_stock_after,
            reason=r.reason,
            risk_mitigated=r.risk_mitigated,
            status=r.status,
            generated_at=r.generated_at,
            approved_at=r.approved_at
        ))
    return results

@router.post("/redistribution-recommendations/generate", response_model=List[TransferRecommendationResponse])
def trigger_redistribution_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN"))
):
    recs = generate_redistribution_recommendations(db)
    results = []
    for r in recs:
        src = db.query(Hospital).filter(Hospital.id == r.source_hospital_id).first()
        dest = db.query(Hospital).filter(Hospital.id == r.destination_hospital_id).first()
        results.append(TransferRecommendationResponse(
            id=r.id,
            source_hospital_id=r.source_hospital_id,
            source_hospital_name=src.name if src else None,
            destination_hospital_id=r.destination_hospital_id,
            destination_hospital_name=dest.name if dest else None,
            blood_group=r.blood_group,
            component_type=r.component_type,
            suggested_units=r.suggested_units,
            source_stock_before=r.source_stock_before,
            source_stock_after=r.source_stock_after,
            dest_stock_before=r.dest_stock_before,
            dest_stock_after=r.dest_stock_after,
            reason=r.reason,
            risk_mitigated=r.risk_mitigated,
            status=r.status,
            generated_at=r.generated_at,
            approved_at=r.approved_at
        ))
    return results

@router.post("/recommendations/{recommendation_id}/review")
def review_recommendation_action(
    recommendation_id: int,
    payload: TransferReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN"))
):
    rec = review_transfer_recommendation(
        db=db,
        recommendation_id=recommendation_id,
        action=payload.action,
        user=current_user,
        notes=payload.notes
    )
    return {
        "message": f"Recommendation #{rec.id} status updated to {rec.status}",
        "recommendation_id": rec.id,
        "status": rec.status
    }

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    payload: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(RiskAlert).filter(RiskAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found")

    alert.is_acknowledged = True
    alert.acknowledged_at = datetime.datetime.utcnow()
    alert.acknowledged_by_user_id = current_user.id
    db.commit()
    return {"message": f"Alert #{alert.id} acknowledged by {current_user.email}"}
