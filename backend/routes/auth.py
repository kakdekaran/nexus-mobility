import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from models.user import (
    ForgotPassword,
    PasswordChange,
    ResetPassword,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)
from services.auth_handler import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from services.db import (
    add_log, 
    add_user, 
    get_user_by_email, 
    log_activity, 
    update_user, 
    get_notifications, 
    mark_notification_read
)

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate):
    if user.role == "Admin":
        raise HTTPException(status_code=403, detail="Admin accounts must be created by an existing admin")

    # Normalize email to lowercase for consistency
    normalized_email = user.email.strip().lower()
    
    existing = get_user_by_email(normalized_email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "name": user.name.strip(),
        "email": normalized_email,
        "password": get_password_hash(user.password),
        "role": user.role,
        "created_at": datetime.utcnow().isoformat(),
        "last_login": None,
        "password_reset_token": None,
        "password_reset_expires": None
    }
    add_user(new_user)
    
    # Log registration
    add_log({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "type": "user_registered",
        "email": normalized_email,
        "role": user.role
    })
    
    return new_user

@router.post("/login", response_model=Token)
def login(user: UserLogin):
    # Normalize email to lowercase for consistency
    normalized_email = user.email.strip().lower()
    
    db_user = get_user_by_email(normalized_email)
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if not verify_password(user.password, db_user.get("password", "")):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    # Update last login
    update_user(db_user["id"], {"last_login": datetime.utcnow().isoformat()})
    
    # Log login activity
    log_activity({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "user_email": normalized_email,
        "action": "login",
        "details": "User logged in successfully"
    })
    
    add_log({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "type": "user_login",
        "email": normalized_email,
        "role": db_user["role"]
    })
    
    access_token = create_access_token(data={
        "sub": db_user["email"], 
        "role": db_user["role"],
        "user_id": db_user["id"]
    })
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": db_user["role"],
        "user_id": db_user["id"],
        "name": db_user.get("name", "User")
    }

@router.post("/forgot-password")
def forgot_password(data: ForgotPassword):
    user = get_user_by_email(data.email)
    if not user:
        # Don't reveal if email exists
        return {"message": "If email exists, reset instructions have been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_expires = (datetime.utcnow().timestamp() + 3600)  # 1 hour
    
    update_user(user["id"], {
        "password_reset_token": reset_token,
        "password_reset_expires": reset_expires
    })
    
    # In real app, send email here
    # For demo, we'll just log it
    add_log({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "type": "password_reset_requested",
        "email": data.email,
        "token": reset_token
    })
    
    return {"message": "If email exists, reset instructions have been sent"}

@router.post("/reset-password")
def reset_password(data: ResetPassword):
    from services.db import get_users
    users = get_users()
    
    for user in users:
        if (user.get("password_reset_token") == data.token and 
            user.get("password_reset_expires") and
            datetime.utcnow().timestamp() < user["password_reset_expires"]):
            
            # Reset password
            update_user(user["id"], {
                "password": get_password_hash(data.new_password),
                "password_reset_token": None,
                "password_reset_expires": None
            })
            
            add_log({
                "id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat(),
                "type": "password_reset_completed",
                "email": user["email"]
            })
            
            return {"message": "Password reset successful"}
    
    raise HTTPException(status_code=400, detail="Invalid or expired reset token")

@router.post("/change-password")
def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = get_user_by_email(current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(data.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    update_user(user["id"], {
        "password": get_password_hash(data.new_password)
    })
    
    log_activity({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "user_email": current_user["sub"],
        "action": "password_changed",
        "details": "User changed their password"
    })
    
    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    user = get_user_by_email(current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me", response_model=UserResponse)
def update_current_user_info(updates: UserUpdate, current_user: dict = Depends(get_current_user)):
    user = get_user_by_email(current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    allowed_updates = updates.model_dump(exclude_unset=True) if hasattr(updates, "model_dump") else updates.dict(exclude_unset=True)
    allowed_updates = {key: value for key, value in allowed_updates.items() if key == "name"}
    
    if allowed_updates:
        updated = update_user(user["id"], allowed_updates)
        log_activity({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "user_email": current_user["sub"],
            "action": "profile_updated",
            "details": f"Updated fields: {', '.join(allowed_updates.keys())}"
        })
        return updated
    
    return user

@router.get("/notifications")
def fetch_notifications(current_user: dict = Depends(get_current_user)):
    """Fetch notifications for the current user's role and email"""
    all_notifs = get_notifications()
    user_email = current_user["sub"]
    user_role = current_user["role"]
    
    filtered = []
    for n in all_notifs:
        target = n.get("user_email", "all")
        if target in {"all", user_role, user_email}:
            # Add read status for this specific user
            is_read = user_email in n.get("read_by", [])
            filtered.append({**n, "read": is_read})
            
    return sorted(filtered, key=lambda x: x.get("timestamp", ""), reverse=True)

@router.post("/notifications/{notif_id}/read")
def read_notification(notif_id: str, current_user: dict = Depends(get_current_user)):
    """Mark notification as read for current user"""
    success = mark_notification_read(notif_id, current_user["sub"])
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}
