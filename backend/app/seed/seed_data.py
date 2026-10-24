import datetime
import json
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models.models import (
    Hospital,
    User,
    Donor,
    Donation,
    BloodUnit,
    InventoryTransaction,
    BloodRequest,
    RequestFulfillment,
    Reservation,
    TransferRecommendation,
    BloodTransfer,
    DemandForecast,
    ForecastEvaluation,
    RiskAlert,
    Notification,
    AuditLog
)
from app.services.auth_service import get_password_hash
from app.services.inventory_service import calculate_expiry
from app.services.ai_forecasting import generate_forecasts
from app.services.ai_shortage import compute_shortage_risks
from app.services.ai_expiry import evaluate_expiry_risks
from app.services.ai_redistribution import generate_redistribution_recommendations

def seed_database(db: Session):
    print("--- Seeding BloodBridge AI Database ---")
    now = datetime.datetime.utcnow()

    # 1. Hospitals
    hospitals_data = [
        {
            "id": 1,
            "name": "Metropolitan General Hospital",
            "code": "METRO",
            "address": "450 Medical Center Boulevard",
            "city": "Boston",
            "state": "MA",
            "contact_phone": "+1 (617) 555-0199",
            "contact_email": "bloodbank@metrogeneral.org",
            "tier": "Level 1 Trauma Center (850 Beds)",
            "lat": 42.3601,
            "lng": -71.0589
        },
        {
            "id": 2,
            "name": "St. Jude Regional Medical Center",
            "code": "STJUDE",
            "address": "820 Healthcare Parkway",
            "city": "Cambridge",
            "state": "MA",
            "contact_phone": "+1 (617) 555-0244",
            "contact_email": "transfusion@stjuderegional.org",
            "tier": "Surgical & Community Hospital (420 Beds)",
            "lat": 42.3736,
            "lng": -71.1097
        },
        {
            "id": 3,
            "name": "Highland Children's & Specialty Hospital",
            "code": "HIGHLAND",
            "address": "1200 Highland Avenue",
            "city": "Somerville",
            "state": "MA",
            "contact_phone": "+1 (617) 555-0377",
            "contact_email": "lab@highlandchildrens.org",
            "tier": "Pediatric & Oncology Specialty (280 Beds)",
            "lat": 42.3876,
            "lng": -71.0995
        },
        {
            "id": 4,
            "name": "Westside Community Health Network",
            "code": "WESTSIDE",
            "address": "95 Commonwealth Drive",
            "city": "Newton",
            "state": "MA",
            "contact_phone": "+1 (617) 555-0488",
            "contact_email": "supplies@westsidehealth.org",
            "tier": "Acute Care & Urgent Center (190 Beds)",
            "lat": 42.3370,
            "lng": -71.2092
        }
    ]

    for h in hospitals_data:
        existing = db.query(Hospital).filter(Hospital.id == h["id"]).first()
        if not existing:
            hosp = Hospital(**h)
            db.add(hosp)
    db.commit()

    # 2. Seeded Users
    users_data = [
        {
            "email": "admin@bloodbridge.ai",
            "password": "AdminPass123!",
            "full_name": "Dr. Eleanor Vance (Super Admin)",
            "role": "SUPER_ADMIN",
            "hospital_id": None
        },
        {
            "email": "metro.admin@bloodbridge.ai",
            "password": "HospitalPass123!",
            "full_name": "Marcus Aurelius, MD (Hospital Admin)",
            "role": "HOSPITAL_ADMIN",
            "hospital_id": 1
        },
        {
            "email": "staff@bloodbridge.ai",
            "password": "StaffPass123!",
            "full_name": "Sarah Jenkins, MLS(ASCP) (Blood Bank Staff)",
            "role": "BLOOD_BANK_STAFF",
            "hospital_id": 1
        },
        {
            "email": "analyst@bloodbridge.ai",
            "password": "AnalystPass123!",
            "full_name": "David Chen (Healthcare Analyst)",
            "role": "READ_ONLY_ANALYST",
            "hospital_id": 1
        },
        {
            "email": "stjude.admin@bloodbridge.ai",
            "password": "HospitalPass123!",
            "full_name": "Dr. Robert Thorne (St. Jude Admin)",
            "role": "HOSPITAL_ADMIN",
            "hospital_id": 2
        }
    ]

    for u in users_data:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                email=u["email"],
                hashed_password=get_password_hash(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                hospital_id=u["hospital_id"],
                is_active=True
            )
            db.add(user)
    db.commit()

    # 3. Anonymized Donors
    donors_data = [
        {"donor_code": "DNR-2024-0012", "age_group": "26-35", "gender": "Female", "blood_group": "O-", "total_donations": 8},
        {"donor_code": "DNR-2024-0034", "age_group": "36-45", "gender": "Male", "blood_group": "O+", "total_donations": 14},
        {"donor_code": "DNR-2024-0056", "age_group": "18-25", "gender": "Male", "blood_group": "A+", "total_donations": 3},
        {"donor_code": "DNR-2024-0078", "age_group": "46-55", "gender": "Female", "blood_group": "A-", "total_donations": 6},
        {"donor_code": "DNR-2024-0090", "age_group": "26-35", "gender": "Male", "blood_group": "B+", "total_donations": 9},
        {"donor_code": "DNR-2024-0112", "age_group": "36-45", "gender": "Female", "blood_group": "B-", "total_donations": 4},
        {"donor_code": "DNR-2024-0134", "age_group": "56+", "gender": "Male", "blood_group": "AB+", "total_donations": 21},
        {"donor_code": "DNR-2024-0156", "age_group": "18-25", "gender": "Female", "blood_group": "AB-", "total_donations": 2},
        {"donor_code": "DNR-2024-0178", "age_group": "26-35", "gender": "Male", "blood_group": "O+", "total_donations": 11},
        {"donor_code": "DNR-2024-0190", "age_group": "36-45", "gender": "Female", "blood_group": "A+", "total_donations": 5},
    ]

    for d in donors_data:
        existing = db.query(Donor).filter(Donor.donor_code == d["donor_code"]).first()
        if not existing:
            donor = Donor(
                donor_code=d["donor_code"],
                age_group=d["age_group"],
                gender=d["gender"],
                blood_group=d["blood_group"],
                total_donations=d["total_donations"],
                last_donation_date=now - datetime.timedelta(days=d["total_donations"] * 12)
            )
            db.add(donor)
    db.commit()

    # 4. Donations
    donors = db.query(Donor).all()
    for i, donor in enumerate(donors):
        code = f"DON-2024-{1000 + i}"
        existing = db.query(Donation).filter(Donation.donation_code == code).first()
        if not existing:
            donation = Donation(
                donation_code=code,
                donor_id=donor.id,
                hospital_id=(i % 3) + 1,
                donation_date=now - datetime.timedelta(days=(i * 3) + 1),
                blood_group=donor.blood_group,
                component_type="Red Blood Cells" if i % 2 == 0 else "Whole Blood",
                volume_ml=450,
                screening_status="Passed",
                notes="Screening passed (HIV, HBV, HCV, Syphilis non-reactive)."
            )
            db.add(donation)
    db.commit()

    # 5. Inventory Units (Generating balanced realistic distribution across hospitals)
    blood_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    components = ["Red Blood Cells", "Whole Blood", "Platelets", "Plasma"]

    unit_counter = 1000
    for hosp_id in [1, 2, 3]:
        for bg in blood_groups:
            for comp in components:
                # Deliberately seed:
                # Hospital 1 (Metro): short on O- RBC (only 2 units), high on A+ RBC (12 units)
                # Hospital 2 (St. Jude): surplus on B+ and O- RBC (8 units) -> triggers Redistribution!
                # Units near expiry (e.g. 2 Platelet units expiring in 40 hours)
                if hosp_id == 1 and bg == "O-" and comp == "Red Blood Cells":
                    count = 2
                elif hosp_id == 2 and bg == "B+" and comp == "Red Blood Cells":
                    count = 14
                elif hosp_id == 2 and bg == "O-" and comp == "Red Blood Cells":
                    count = 8
                else:
                    count = 3 if bg in ["O+", "A+"] else 2

                for u_idx in range(count):
                    unit_counter += 1
                    unit_num = f"BLD-H{hosp_id}-{bg.replace('+', 'P').replace('-', 'N')}-{unit_counter}"
                    existing = db.query(BloodUnit).filter(BloodUnit.unit_number == unit_num).first()
                    if not existing:
                        # Expiry variations
                        if comp == "Platelets" and u_idx == 0:
                            # 40 hours to expiry
                            col_date = now - datetime.timedelta(days=3)
                            exp_date = now + datetime.timedelta(hours=40)
                        elif u_idx == 1 and comp == "Red Blood Cells" and hosp_id == 1 and bg == "A+":
                            # 3 days to expiry
                            col_date = now - datetime.timedelta(days=39)
                            exp_date = now + datetime.timedelta(days=3)
                        else:
                            col_date = now - datetime.timedelta(days=7)
                            exp_date = calculate_expiry(comp, col_date)

                        b_unit = BloodUnit(
                            unit_number=unit_num,
                            hospital_id=hosp_id,
                            blood_group=bg,
                            component_type=comp,
                            collection_date=col_date,
                            expiry_date=exp_date,
                            storage_location=f"Vault {hosp_id} - Shelf {comp[0]}",
                            status="Available",
                            quality_screening_status="Passed",
                            is_reserved=False
                        )
                        db.add(b_unit)
    db.commit()

    # 6. Blood Requests (including 1 Emergency & 1 Urgent)
    requests_data = [
        {
            "request_code": "REQ-EMG-001",
            "requesting_hospital_id": 1,
            "patient_ref": "PT-TRAUMA-9140",
            "blood_group": "O-",
            "component_type": "Red Blood Cells",
            "units_requested": 4,
            "urgency_level": "Emergency",
            "status": "Pending",
            "required_by": now + datetime.timedelta(hours=2),
            "compatibility_verified": True,
            "staff_notes": "Stat! Polytrauma MVA admitted to ER Bay 1. Active hemorrhagic shock."
        },
        {
            "request_code": "REQ-URG-002",
            "requesting_hospital_id": 1,
            "patient_ref": "PT-HEMA-3021",
            "blood_group": "A+",
            "component_type": "Platelets",
            "units_requested": 2,
            "urgency_level": "Urgent",
            "status": "Under_Review",
            "required_by": now + datetime.timedelta(hours=8),
            "compatibility_verified": True,
            "staff_notes": "Oncology patient with severe thrombocytopenia (platelet count < 10k)."
        },
        {
            "request_code": "REQ-ROUTINE-003",
            "requesting_hospital_id": 2,
            "patient_ref": "PT-SURG-7712",
            "blood_group": "B+",
            "component_type": "Whole Blood",
            "units_requested": 2,
            "urgency_level": "Routine",
            "status": "Fulfilled",
            "required_by": now - datetime.timedelta(days=1),
            "compatibility_verified": True,
            "staff_notes": "Elective orthopedic hip arthroplasty."
        }
    ]

    for req_d in requests_data:
        existing = db.query(BloodRequest).filter(BloodRequest.request_code == req_d["request_code"]).first()
        if not existing:
            r = BloodRequest(**req_d)
            db.add(r)
    db.commit()

    # 7. Pre-generate Forecasts, Evaluations, and Risks for Hospital 1 & 2
    try:
        generate_forecasts(db, hospital_id=1, horizon_days=7)
        compute_shortage_risks(db, hospital_id=1)
        evaluate_expiry_risks(db, hospital_id=1)
        generate_redistribution_recommendations(db)
    except Exception as e:
        print(f"Notice: Initial AI generation step: {e}")

    # 8. Notifications
    notifs = [
        {
            "title": "EMERGENCY BLOOD REQUEST",
            "message": "Trauma Bay 1 requested 4 units of O- Red Blood Cells urgently.",
            "severity": "Critical",
            "notification_type": "Request",
            "hospital_id": 1,
            "related_link": "/requests"
        },
        {
            "title": "SHORTAGE WARNING: O- Red Blood Cells",
            "message": "Eligible stock is at 2 units. 7-day predicted burn is 8.4 units.",
            "severity": "Critical",
            "notification_type": "Shortage",
            "hospital_id": 1,
            "related_link": "/ai/shortage-risks"
        },
        {
            "title": "INTER-HOSPITAL TRANSFER OPPORTUNITY",
            "message": "St. Jude Regional Medical Center identified with 8 units surplus of O- RBC.",
            "severity": "Info",
            "notification_type": "Transfer",
            "hospital_id": 1,
            "related_link": "/ai/redistribution"
        }
    ]

    for n in notifs:
        existing = db.query(Notification).filter(Notification.title == n["title"]).first()
        if not existing:
            notif = Notification(**n)
            db.add(notif)
    db.commit()

    print("--- Database Seeding Complete! ---")

def reset_and_reseed():
    db = SessionLocal()
    try:
        # Drop and re-create all tables
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        seed_database(db)
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_reseed()
