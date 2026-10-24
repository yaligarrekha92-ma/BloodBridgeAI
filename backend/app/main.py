from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
from app.routers import (
    auth,
    dashboard,
    hospitals,
    inventory,
    donations,
    requests,
    ai,
    transfers,
    analytics,
    notifications,
    audit_logs
)
from app.seed.seed_data import seed_database, reset_and_reseed
from app.models.models import Hospital
from app.services.auth_service import get_current_user, require_roles

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="BloodBridge AI — Smart Blood Bank Intelligence & Predictive Healthcare Logistics Platform API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup hook to auto-seed database on first launch
@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        hospital_count = db.query(Hospital).count()
        if hospital_count == 0:
            print("Detected empty database. Running initial seed data...")
            seed_database(db)
    finally:
        db.close()

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(hospitals.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(donations.router, prefix=settings.API_V1_STR)
app.include_router(requests.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(transfers.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(audit_logs.router, prefix=settings.API_V1_STR)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "Simulation / Demonstration"
    }

@app.post("/api/admin/reset-database")
def reset_database_endpoint():
    """Resets database to clean initial seeded demonstration state."""
    reset_and_reseed()
    return {"message": "Database successfully reset and re-seeded with demo data"}
