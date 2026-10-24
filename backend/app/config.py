import os

class Settings:
    PROJECT_NAME: str = "BloodBridge AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "bloodbridge-dev-super-secure-secret-key-2024-998877")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # SQLite default fallback with optional PostgreSQL support
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bloodbridge.db")
    
    # AI Forecasting Settings
    FORECAST_HORIZON_SHORT: int = 7
    FORECAST_HORIZON_LONG: int = 14
    
    # Expiry Shelf Life Defaults (in days)
    SHELF_LIFE_DAYS: dict = {
        "Whole Blood": 35,
        "Red Blood Cells": 42,
        "Platelets": 5,
        "Plasma": 365,
    }
    
    # Shortage thresholds (ratio of stock / forecasted 7d demand)
    SHORTAGE_CRITICAL_RATIO: float = 0.35
    SHORTAGE_HIGH_RATIO: float = 0.65
    SHORTAGE_MEDIUM_RATIO: float = 1.00

settings = Settings()
