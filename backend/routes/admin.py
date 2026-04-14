import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from models.user import UserResponse, UserUpdate, NotificationCreate
from services.auth_handler import get_current_active_admin
from services.db import (
    add_log,
    add_notification,
    delete_user,
    get_activity_logs,
    get_logs,
    get_user_by_id,
    get_users,
    update_user,
)
from services.dataset_service import DatasetServiceError, validate_and_save_uploaded_dataset

router = APIRouter()

@router.get("/users")
def list_users(current_admin: dict = Depends(get_current_active_admin)):
    """Get all users - Admin only"""
    users = get_users()
    # Don't return passwords
    return [{k: v for k, v in u.items() if k != 'password'} for u in users]

@router.post("/broadcast")
def broadcast_notification(notification: NotificationCreate, current_admin: dict = Depends(get_current_active_admin)):
    """Broadcast notification - Admin only"""
    notif_id = str(uuid.uuid4())
    new_notif = {
        "id": notif_id,
        "timestamp": datetime.utcnow().isoformat(),
        "sender": current_admin["sub"],
        "sender_role": "Admin",
        **notification.model_dump()
    }
    add_notification(new_notif)
    
    add_log({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "type": "admin_broadcast_sent",
        "admin_email": current_admin["sub"],
        "target": notification.user_email,
        "title": notification.title
    })
    
    return {"message": "Broadcast sent successfully", "id": notif_id}

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, current_admin: dict = Depends(get_current_active_admin)):
    """Get specific user - Admin only"""
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}")
def update_user_admin(user_id: str, updates: UserUpdate, current_admin: dict = Depends(get_current_active_admin)):
    """Update user (including role) - Admin only"""
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    allowed_updates = updates.model_dump(exclude_unset=True) if hasattr(updates, "model_dump") else updates.dict(exclude_unset=True)
    
    if allowed_updates:
        updated = update_user(user_id, allowed_updates)
        
        add_log({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "type": "admin_user_updated",
            "admin_email": current_admin["sub"],
            "target_user": user["email"],
            "updates": list(allowed_updates.keys())
        })
        
        return updated
    
    return user

@router.delete("/users/{user_id}")
def delete_user_admin(user_id: str, current_admin: dict = Depends(get_current_active_admin)):
    """Delete user - Admin only"""
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["role"] == "Admin" and user["email"] == current_admin["sub"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    delete_user(user_id)
    
    add_log({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "type": "admin_user_deleted",
        "admin_email": current_admin["sub"],
        "deleted_user": user["email"]
    })
    
    return {"message": "User deleted successfully"}

@router.get("/logs")
def get_system_logs(limit: int = 100, current_admin: dict = Depends(get_current_active_admin)):
    """Get system logs - Admin only"""
    return get_logs(limit)

@router.get("/activity-logs")
def get_user_activity(limit: int = 100, current_admin: dict = Depends(get_current_active_admin)):
    """Get user activity logs - Admin only"""
    return get_activity_logs(limit)

@router.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...), current_admin: dict = Depends(get_current_active_admin)):
    """Upload new dataset - Admin only"""
    try:
        result = validate_and_save_uploaded_dataset(file)
    except DatasetServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    file_path = os.path.join("data", "uploads", result["filename"])

    add_log({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "type": "admin_dataset_uploaded",
        "admin_email": current_admin["sub"],
        "filename": result["filename"],
        "original_filename": file.filename,
        "rows": result["rows"],
        "uploaded_at": result["uploaded_at"],
        "file_path": file_path
    })
    
    return {
        "message": "Dataset uploaded successfully",
        "filename": result["filename"],
        "rows": result["rows"],
    }

@router.get("/stats")
def get_admin_stats(current_admin: dict = Depends(get_current_active_admin)):
    """Get system statistics - Admin only"""
    users = get_users()
    logs = get_logs(1000)
    activity = get_activity_logs(1000)
    
    return {
        "total_users": len(users),
        "users_by_role": {
            "Admin": len([u for u in users if u.get("role") == "Admin"]),
            "Analyst": len([u for u in users if u.get("role") == "Analyst"]),
            "User": len([u for u in users if u.get("role") == "User"])
        },
        "total_logs": len(logs),
        "total_activity": len(activity),
        "recent_logins": len([a for a in activity if a.get("action") == "login"])
    }
