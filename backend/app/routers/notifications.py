from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Notification, User
from app.schemas.schemas import NotificationResponse
from app.services.auth_service import get_current_user
from app.services.notification_service import (
    get_user_notifications,
    mark_notification_read
)

router = APIRouter(prefix="/notifications", tags=["Notification Center"])

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifs = get_user_notifications(
        db=db,
        user_id=current_user.id,
        hospital_id=current_user.hospital_id,
        unread_only=unread_only
    )
    return notifs

@router.post("/{notification_id}/read")
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = mark_notification_read(db, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read", "id": notification_id}

@router.post("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user.role != "SUPER_ADMIN":
        query = query.filter(
            (Notification.hospital_id == current_user.hospital_id) | (Notification.hospital_id == None)
        )
    query.update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}
