from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

UserRole = Literal["Admin", "Analyst", "User"]

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = "User"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    created_at: Optional[str] = None
    last_login: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=128)

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)

class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole
    user_id: Optional[str] = None
    name: Optional[str] = None

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info" # info, warning, alert, success
    user_email: str = "all" # "all" or specific email

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

class BookmarkCreate(BaseModel):
    city: str
    notes: Optional[str] = None
