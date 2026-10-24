import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    address = Column(String(300), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    contact_email = Column(String(100), nullable=False)
    tier = Column(String(50), default="Level 1 Trauma Center")  # e.g., Community Hospital, Trauma Center
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="hospital")
    blood_units = relationship("BloodUnit", back_populates="hospital")
    requests = relationship("BloodRequest", back_populates="hospital")
    donations = relationship("Donation", back_populates="hospital")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False)  # SUPER_ADMIN, HOSPITAL_ADMIN, BLOOD_BANK_STAFF, READ_ONLY_ANALYST
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="users")


class Donor(Base):
    __tablename__ = "donors"

    id = Column(Integer, primary_key=True, index=True)
    donor_code = Column(String(50), unique=True, index=True, nullable=False)  # anonymized e.g. DNR-2024-9102
    age_group = Column(String(30), nullable=False)  # 18-25, 26-35, 36-45, 46-55, 56+
    gender = Column(String(20), nullable=False)  # Male, Female, Other
    blood_group = Column(String(10), nullable=False)  # A+, A-, B+, B-, AB+, AB-, O+, O-
    eligibility_status = Column(String(50), default="Eligible")  # Eligible, Deferred, Temporary Ineligible
    total_donations = Column(Integer, default=1)
    last_donation_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    donations = relationship("Donation", back_populates="donor")


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donation_code = Column(String(50), unique=True, index=True, nullable=False)
    donor_id = Column(Integer, ForeignKey("donors.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    donation_date = Column(DateTime, default=datetime.datetime.utcnow)
    blood_group = Column(String(10), nullable=False)
    component_type = Column(String(50), default="Whole Blood")  # Whole Blood, Red Blood Cells, Platelets, Plasma
    volume_ml = Column(Integer, default=450)
    screening_status = Column(String(50), default="Pending")  # Pending, Passed, Failed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    donor = relationship("Donor", back_populates="donations")
    hospital = relationship("Hospital", back_populates="donations")
    blood_units = relationship("BloodUnit", back_populates="donation")


class BloodUnit(Base):
    __tablename__ = "blood_units"

    id = Column(Integer, primary_key=True, index=True)
    unit_number = Column(String(60), unique=True, index=True, nullable=False)  # e.g., BLD-MC-O-POS-1002
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    donation_id = Column(Integer, ForeignKey("donations.id"), nullable=True)
    blood_group = Column(String(10), nullable=False)  # A+, A-, B+, B-, AB+, AB-, O+, O-
    component_type = Column(String(50), nullable=False)  # Whole Blood, Red Blood Cells, Platelets, Plasma
    collection_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    storage_location = Column(String(100), nullable=False)  # e.g., Cold Room 1 - Bay B
    status = Column(String(50), default="Available")  # Available, Reserved, Issued, Expired, Discarded, In_Transit
    quality_screening_status = Column(String(50), default="Passed")  # Passed, Pending, Failed
    is_reserved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="blood_units")
    donation = relationship("Donation", back_populates="blood_units")
    transactions = relationship("InventoryTransaction", back_populates="unit")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("blood_units.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    transaction_type = Column(String(50), nullable=False)  # Intake, Reserve, Release_Reserve, Issue, Transfer_Out, Transfer_In, Discard, Expired
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    unit = relationship("BloodUnit", back_populates="transactions")


class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(50), unique=True, index=True, nullable=False)
    requesting_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    patient_ref = Column(String(50), nullable=False)  # anonymized e.g. PT-ER-9821
    blood_group = Column(String(10), nullable=False)
    component_type = Column(String(50), nullable=False)
    units_requested = Column(Integer, default=1)
    units_allocated = Column(Integer, default=0)
    urgency_level = Column(String(30), default="Routine")  # Routine, Urgent, Emergency
    status = Column(String(50), default="Pending")  # Pending, Under_Review, Partially_Fulfilled, Fulfilled, Rejected, Cancelled
    requested_at = Column(DateTime, default=datetime.datetime.utcnow)
    required_by = Column(DateTime, nullable=False)
    compatibility_verified = Column(Boolean, default=False)
    staff_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="requests")
    fulfillments = relationship("RequestFulfillment", back_populates="request")
    reservations = relationship("Reservation", back_populates="request")


class RequestFulfillment(Base):
    __tablename__ = "request_fulfillments"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("blood_requests.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("blood_units.id"), nullable=False)
    fulfilled_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    fulfilled_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)

    request = relationship("BloodRequest", back_populates="fulfillments")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("blood_requests.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("blood_units.id"), nullable=False)
    reserved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reserved_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(50), default="Active")  # Active, Released, Converted_To_Issue

    request = relationship("BloodRequest", back_populates="reservations")


class TransferRecommendation(Base):
    __tablename__ = "transfer_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    source_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    destination_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    blood_group = Column(String(10), nullable=False)
    component_type = Column(String(50), nullable=False)
    suggested_units = Column(Integer, nullable=False)
    source_stock_before = Column(Integer, default=0)
    source_stock_after = Column(Integer, default=0)
    dest_stock_before = Column(Integer, default=0)
    dest_stock_after = Column(Integer, default=0)
    reason = Column(Text, nullable=False)
    risk_mitigated = Column(String(100), default="Shortage & Expiry Prevention")
    status = Column(String(50), default="Proposed")  # Proposed, Approved, Rejected, In_Transit, Completed, Cancelled
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)


class BloodTransfer(Base):
    __tablename__ = "blood_transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_code = Column(String(50), unique=True, index=True, nullable=False)
    recommendation_id = Column(Integer, ForeignKey("transfer_recommendations.id"), nullable=True)
    source_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    destination_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    blood_group = Column(String(10), nullable=False)
    component_type = Column(String(50), nullable=False)
    units_count = Column(Integer, nullable=False)
    status = Column(String(50), default="Scheduled")  # Scheduled, Dispatched, In_Transit, Received, Cancelled
    dispatch_time = Column(DateTime, nullable=True)
    estimated_arrival = Column(DateTime, nullable=True)
    received_time = Column(DateTime, nullable=True)
    carrier_info = Column(String(150), default="MediExpress Cold-Chain Logistics #TX-409")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DemandForecast(Base):
    __tablename__ = "demand_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    blood_group = Column(String(10), nullable=False)
    component_type = Column(String(50), nullable=False)
    forecast_horizon_days = Column(Integer, default=7)  # 7 or 14
    forecast_date = Column(DateTime, default=datetime.datetime.utcnow)
    predicted_daily_demand = Column(Text, nullable=False)  # JSON string of daily numbers
    predicted_total_demand = Column(Float, nullable=False)
    confidence_lower = Column(Float, nullable=False)
    confidence_upper = Column(Float, nullable=False)
    model_version = Column(String(50), default="BloodBridge-ML-v1.2")
    is_baseline = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ForecastEvaluation(Base):
    __tablename__ = "forecast_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    model_version = Column(String(50), nullable=False)
    evaluation_date = Column(DateTime, default=datetime.datetime.utcnow)
    blood_group = Column(String(10), nullable=False)
    component_type = Column(String(50), nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    r2_score = Column(Float, nullable=False)
    baseline_mae = Column(Float, nullable=False)
    baseline_rmse = Column(Float, nullable=False)
    sample_count = Column(Integer, default=90)
    notes = Column(Text, nullable=True)


class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    blood_group = Column(String(10), nullable=False)
    component_type = Column(String(50), nullable=False)
    risk_type = Column(String(50), nullable=False)  # Shortage, Expiry, Imbalance
    severity = Column(String(20), nullable=False)  # Low, Medium, High, Critical
    current_stock = Column(Integer, nullable=False)
    expected_demand = Column(Float, nullable=False)
    stock_gap = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(30), default="Info")  # Info, Warning, Critical, Success
    notification_type = Column(String(50), default="General")  # Shortage, Expiry, Request, Transfer, System
    related_link = Column(String(200), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(150), nullable=True)
    hospital_id = Column(Integer, nullable=True)
    action = Column(String(100), nullable=False)  # ISSUE_UNIT, RESERVE_UNIT, CREATE_TRANSFER, etc.
    resource_type = Column(String(50), nullable=False)  # BloodUnit, BloodRequest, BloodTransfer
    resource_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
