from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/audit-logs", tags=["Audit & Compliance"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    resource_type: Optional[str] = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SUPER_ADMIN", "HOSPITAL_ADMIN", "READ_ONLY_ANALYST"))
):
    query = db.query(AuditLog)
    if current_user.role != "SUPER_ADMIN":
        query = query.filter(AuditLog.hospital_id == current_user.hospital_id)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
