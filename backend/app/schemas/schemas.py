import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth Schemas -----------------
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    hospital_id: Optional[int] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    hospital_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- Hospital Schemas -----------------
class HospitalBase(BaseModel):
    name: str
    code: str
    address: str
    city: str
    state: str
    contact_phone: str
    contact_email: str
    tier: str = "Level 1 Trauma Center"
    lat: Optional[float] = None
    lng: Optional[float] = None

class HospitalCreate(HospitalBase):
    pass

class HospitalResponse(HospitalBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- Donor & Donation Schemas -----------------
class DonorBase(BaseModel):
    donor_code: str
    age_group: str
    gender: str
    blood_group: str
    eligibility_status: str = "Eligible"

class DonorCreate(DonorBase):
    pass

class DonorResponse(DonorBase):
    id: int
    total_donations: int
    last_donation_date: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class DonationBase(BaseModel):
    donor_id: int
    hospital_id: int
    blood_group: str
    component_type: str = "Whole Blood"
    volume_ml: int = 450
    screening_status: str = "Pending"
    notes: Optional[str] = None

class DonationCreate(DonationBase):
    pass

class DonationResponse(DonationBase):
    id: int
    donation_code: str
    donation_date: datetime.datetime
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- Inventory / Blood Unit Schemas -----------------
class BloodUnitBase(BaseModel):
    hospital_id: int
    donation_id: Optional[int] = None
    blood_group: str
    component_type: str
    storage_location: str
    status: str = "Available"
    quality_screening_status: str = "Passed"

class BloodUnitCreate(BloodUnitBase):
    unit_number: Optional[str] = None
    collection_date: Optional[datetime.datetime] = None
    expiry_date: Optional[datetime.datetime] = None

class BloodUnitUpdate(BaseModel):
    storage_location: Optional[str] = None
    status: Optional[str] = None
    quality_screening_status: Optional[str] = None

class BloodUnitResponse(BloodUnitBase):
    id: int
    unit_number: str
    collection_date: datetime.datetime
    expiry_date: datetime.datetime
    is_reserved: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    hospital_name: Optional[str] = None
    days_to_expiry: Optional[int] = None

    class Config:
        from_attributes = True

class UnitReserveRequest(BaseModel):
    request_id: int
    notes: Optional[str] = None

class UnitIssueRequest(BaseModel):
    request_id: Optional[int] = None
    patient_ref: Optional[str] = None
    notes: Optional[str] = None

# ----------------- Blood Request Schemas -----------------
class BloodRequestBase(BaseModel):
    requesting_hospital_id: int
    patient_ref: str
    blood_group: str
    component_type: str
    units_requested: int = 1
    urgency_level: str = "Routine"  # Routine, Urgent, Emergency
    required_by: datetime.datetime
    staff_notes: Optional[str] = None

class BloodRequestCreate(BloodRequestBase):
    pass

class BloodRequestResponse(BloodRequestBase):
    id: int
    request_code: str
    units_allocated: int
    status: str
    requested_at: datetime.datetime
    compatibility_verified: bool
    created_at: datetime.datetime
    hospital_name: Optional[str] = None

    class Config:
        from_attributes = True

class RequestApprove(BaseModel):
    staff_notes: Optional[str] = None

class RequestFulfill(BaseModel):
    unit_ids: List[int]
    notes: Optional[str] = None

# ----------------- Transfer Schemas -----------------
class TransferRecommendationResponse(BaseModel):
    id: int
    source_hospital_id: int
    source_hospital_name: Optional[str] = None
    destination_hospital_id: int
    destination_hospital_name: Optional[str] = None
    blood_group: str
    component_type: str
    suggested_units: int
    source_stock_before: int
    source_stock_after: int
    dest_stock_before: int
    dest_stock_after: int
    reason: str
    risk_mitigated: str
    status: str
    generated_at: datetime.datetime
    approved_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class TransferReviewRequest(BaseModel):
    action: str  # approve, reject
    notes: Optional[str] = None

class BloodTransferBase(BaseModel):
    recommendation_id: Optional[int] = None
    source_hospital_id: int
    destination_hospital_id: int
    blood_group: str
    component_type: str
    units_count: int
    carrier_info: str = "MediExpress Cold-Chain Logistics"

class BloodTransferCreate(BloodTransferBase):
    pass

class BloodTransferResponse(BloodTransferBase):
    id: int
    transfer_code: str
    status: str
    dispatch_time: Optional[datetime.datetime] = None
    estimated_arrival: Optional[datetime.datetime] = None
    received_time: Optional[datetime.datetime] = None
    source_hospital_name: Optional[str] = None
    destination_hospital_name: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- AI & Analytics Schemas -----------------
class DemandForecastResponse(BaseModel):
    id: int
    hospital_id: int
    hospital_name: Optional[str] = None
    blood_group: str
    component_type: str
    forecast_horizon_days: int
    forecast_date: datetime.datetime
    predicted_daily_demand: List[float]
    predicted_total_demand: float
    confidence_lower: float
    confidence_upper: float
    model_version: str
    is_baseline: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ForecastGenerationRequest(BaseModel):
    hospital_id: Optional[int] = None
    blood_group: Optional[str] = None
    component_type: Optional[str] = None
    horizon_days: int = 7

class ForecastEvaluationResponse(BaseModel):
    id: int
    model_version: str
    evaluation_date: datetime.datetime
    blood_group: str
    component_type: str
    mae: float
    rmse: float
    r2_score: float
    baseline_mae: float
    baseline_rmse: float
    sample_count: int
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class RiskAlertResponse(BaseModel):
    id: int
    hospital_id: int
    hospital_name: Optional[str] = None
    blood_group: str
    component_type: str
    risk_type: str
    severity: str
    current_stock: int
    expected_demand: float
    stock_gap: float
    reason: str
    recommended_action: str
    is_acknowledged: bool
    acknowledged_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AlertAcknowledgeRequest(BaseModel):
    notes: Optional[str] = None

# ----------------- Compatibility Check -----------------
class CompatibilityCheckRequest(BaseModel):
    donor_blood_group: str
    recipient_blood_group: str
    component_type: str  # Whole Blood, Red Blood Cells, Platelets, Plasma

class CompatibilityCheckResponse(BaseModel):
    compatible: bool
    donor_blood_group: str
    recipient_blood_group: str
    component_type: str
    clinical_explanation: str
    transfusion_risk_category: str  # Safe, High Risk, Fatal Incompatibility
    guidelines_reference: str

# ----------------- Notification & Audit Schemas -----------------
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    severity: str
    notification_type: str
    related_link: Optional[str] = None
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_email: Optional[str] = None
    hospital_id: Optional[int] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# ----------------- Dashboard Summary -----------------
class DashboardSummaryResponse(BaseModel):
    total_available_units: int
    units_reserved: int
    units_approaching_expiry: int
    open_emergency_requests: int
    shortage_risk_groups_count: int
    predicted_7d_demand: float
    dataset_mode: str = "Simulated / Demonstration"
    stock_by_blood_group: Dict[str, int]
    stock_by_component: Dict[str, int]
    demand_vs_stock: List[Dict[str, Any]]
    expiry_risk_summary: List[Dict[str, Any]]
    recent_donations: List[Dict[str, Any]]
    recent_emergency_requests: List[Dict[str, Any]]
    ai_top_insights: List[Dict[str, Any]]
