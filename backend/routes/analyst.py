import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from models.user import NotificationCreate
from services.auth_handler import require_roles
from services.db import add_notification, add_log

router = APIRouter()

@router.post("/notify-users")
def notify_users(notification: NotificationCreate, current_analyst: dict = Depends(require_roles("Admin", "Analyst"))):
    """
    Allow Analysts (and Admins) to send notifications to Users.
    Analysts can ONLY send to 'User' role or specific User emails.
    """
    # Security Check: Analysts cannot send to other Analysts or Admins
    if current_analyst["role"] == "Analyst":
        if notification.user_email == "all" or notification.user_email == "Analyst" or notification.user_email == "Admin":
            # Change target to 'User' role specifically if they tried to send to 'all'
            if notification.user_email == "all":
                 notification.user_email = "User"
            else:
                 raise HTTPException(status_code=403, detail="Analysts can only notify general Users.")

    notif_id = str(uuid.uuid4())
    new_notif = {
        "id": notif_id,
        "timestamp": datetime.utcnow().isoformat(),
        "sender": current_analyst["sub"],
        "sender_role": current_analyst["role"],
        **notification.model_dump()
    }
    add_notification(new_notif)
    
    add_log({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "type": "analyst_notification_sent",
        "analyst_email": current_analyst["sub"],
        "target": notification.user_email,
        "title": notification.title
    })
    
    return {"message": "Notification sent successfully", "id": notif_id}
