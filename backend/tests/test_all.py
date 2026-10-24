import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.models import User, Hospital, BloodUnit, BloodRequest, TransferRecommendation
from app.services.auth_service import get_password_hash, create_access_token
from app.services.compatibility_service import check_compatibility
from app.services.inventory_service import (
    create_blood_unit,
    reserve_blood_unit,
    issue_blood_unit,
    calculate_expiry
)
from app.schemas.schemas import BloodUnitCreate
from app.services.ai_forecasting import train_and_evaluate_forecasting_model
from app.services.ai_shortage import compute_shortage_risks
from app.services.ai_expiry import evaluate_expiry_risks
from app.services.ai_redistribution import generate_redistribution_recommendations

TEST_DATABASE_URL = "sqlite:///./test_bloodbridge.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed 2 test hospitals
    h1 = Hospital(
        id=1, name="General Hospital", code="GEN", address="100 Main St",
        city="Boston", state="MA", contact_phone="555-0100", contact_email="gen@test.com", tier="Level 1"
    )
    h2 = Hospital(
        id=2, name="Saint Mary", code="MARY", address="200 Oak St",
        city="Cambridge", state="MA", contact_phone="555-0200", contact_email="mary@test.com", tier="Community"
    )
    db.add(h1)
    db.add(h2)

    # Seed test users
    u_admin = User(
        email="superadmin@test.com", hashed_password=get_password_hash("Admin123!"),
        full_name="Super Admin", role="SUPER_ADMIN", hospital_id=None, is_active=True
    )
    u_hosp = User(
        email="hospadmin@test.com", hashed_password=get_password_hash("Hosp123!"),
        full_name="Hosp Admin", role="HOSPITAL_ADMIN", hospital_id=1, is_active=True
    )
    u_staff = User(
        email="staff@test.com", hashed_password=get_password_hash("Staff123!"),
        full_name="Staff User", role="BLOOD_BANK_STAFF", hospital_id=1, is_active=True
    )
    db.add(u_admin)
    db.add(u_hosp)
    db.add(u_staff)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)

# 1. Auth & Login Tests
def test_login_success():
    res = client.post("/api/auth/login", json={"email": "superadmin@test.com", "password": "Admin123!"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "SUPER_ADMIN"

def test_login_invalid_credentials():
    res = client.post("/api/auth/login", json={"email": "superadmin@test.com", "password": "WrongPassword"})
    assert res.status_code == 401

def test_protected_route_without_token():
    res = client.get("/api/auth/me")
    assert res.status_code == 401

# 2. Transfusion Compatibility Tests
def test_compatibility_rbc_matching():
    # O- can donate RBC to anyone
    res = check_compatibility("O-", "AB+", "Red Blood Cells")
    assert res["compatible"] is True

    # A+ cannot donate RBC to O-
    res = check_compatibility("A+", "O-", "Red Blood Cells")
    assert res["compatible"] is False
    assert "INCOMPATIBLE" in res["clinical_explanation"]

def test_compatibility_plasma_reversal():
    # In Plasma, AB is universal donor, O is universal recipient
    res_ab_to_o = check_compatibility("AB+", "O+", "Plasma")
    assert res_ab_to_o["compatible"] is True

    res_o_to_ab = check_compatibility("O+", "AB+", "Plasma")
    assert res_o_to_ab["compatible"] is False

def test_compatibility_whole_blood_strict():
    # Whole blood requires identical match
    res_same = check_compatibility("B+", "B+", "Whole Blood")
    assert res_same["compatible"] is True

    res_diff = check_compatibility("O-", "B+", "Whole Blood")
    assert res_diff["compatible"] is False

# 3. Inventory & Expiry Calculations
def test_shelf_life_calculation():
    col_date = datetime.datetime(2024, 1, 1, 12, 0)
    # Platelets: 5 days
    exp_platelets = calculate_expiry("Platelets", col_date)
    assert (exp_platelets - col_date).days == 5

    # RBC: 42 days
    exp_rbc = calculate_expiry("Red Blood Cells", col_date)
    assert (exp_rbc - col_date).days == 42

def test_create_and_reserve_unit():
    db = TestingSessionLocal()
    u_staff = db.query(User).filter(User.email == "staff@test.com").first()
    
    # Create valid unit
    unit_in = BloodUnitCreate(
        hospital_id=1,
        blood_group="A+",
        component_type="Red Blood Cells",
        storage_location="Shelf A1",
        status="Available",
        quality_screening_status="Passed"
    )
    unit = create_blood_unit(db, unit_in, u_staff)
    assert unit.id is not None
    assert unit.is_reserved is False

    # Create dummy request
    req = BloodRequest(
        request_code="REQ-TEST-001",
        requesting_hospital_id=1,
        patient_ref="PT-TEST",
        blood_group="A+",
        component_type="Red Blood Cells",
        units_requested=1,
        required_by=datetime.datetime.utcnow() + datetime.timedelta(days=2)
    )
    db.add(req)
    db.commit()

    # Reserve unit
    res = reserve_blood_unit(db, unit.id, req.id, u_staff)
    assert res.status == "Active"
    assert unit.is_reserved is True
    assert unit.status == "Reserved"

    # Issue unit
    issued = issue_blood_unit(db, unit.id, u_staff, request_id=req.id)
    assert issued.status == "Issued"
    assert issued.is_reserved is False
    assert req.status == "Fulfilled"

    # Test prevention of double issuance
    with pytest.raises(Exception):
        issue_blood_unit(db, unit.id, u_staff)

    db.close()

# 4. AI Forecasting & Evaluation Tests
def test_ai_forecasting_model_evaluation():
    db = TestingSessionLocal()
    metrics, eval_rec = train_and_evaluate_forecasting_model(db, hospital_id=1, blood_group="O+", component_type="Red Blood Cells")
    assert "ml_mae" in metrics
    assert "ml_rmse" in metrics
    assert metrics["ml_mae"] >= 0.0
    assert eval_rec.mae == round(metrics["ml_mae"], 3)
    db.close()

# 5. Shortage Risk Prediction
def test_shortage_risk_generation():
    db = TestingSessionLocal()
    alerts = compute_shortage_risks(db, hospital_id=1)
    assert isinstance(alerts, list)
    for a in alerts:
        assert a.risk_type == "Shortage"
        assert a.severity in ["Low", "Medium", "High", "Critical"]
        assert a.reason != ""
        assert a.recommended_action != ""
    db.close()
