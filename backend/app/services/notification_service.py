import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import Notification

def create_notification(
    db: Session,
    title: str,
    message: str,
    severity: str = "Info",
    notification_type: str = "General",
    hospital_id: Optional[int] = None,
    user_id: Optional[int] = None,
    related_link: Optional[str] = None
) -> Notification:
    notif = Notification(
        title=title,
        message=message,
        severity=severity,
        notification_type=notification_type,
        hospital_id=hospital_id,
        user_id=user_id,
        related_link=related_link,
        is_read=False,
        created_at=datetime.datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def get_user_notifications(
    db: Session,
    user_id: Optional[int] = None,
    hospital_id: Optional[int] = None,
    unread_only: bool = False
) -> List[Notification]:
    query = db.query(Notification)
    if hospital_id:
        query = query.filter(
            (Notification.hospital_id == hospital_id) | (Notification.hospital_id == None)
        )
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.created_at.desc()).limit(50).all()

def mark_notification_read(db: Session, notification_id: int) -> Optional[Notification]:
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif
