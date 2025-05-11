import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List

from markdown_it.rules_inline.backticks import regex
from pydantic import BaseModel, EmailStr, Field

from src.db.models import User


class UserRole(str, Enum):
    ADMIN = 'admin'
    USER = 'user'
    AGENT = 'agent'


class UserBase(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    country: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role: UserRole = UserRole.USER


class UserCreate(UserBase):
    password: str



class UserRead(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    pin_set: bool = Field(..., description="Indique si un pin est defini")



    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    credential: str
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    country: Optional[str] = None
    phone: str
    email: EmailStr

    # profile_picture_url: Optional[str] = None


class UserWithToken(UserRead):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

    class Config:
        from_attributes = True

class EmailModel(BaseModel):
    addresses: List[str]

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str
    confirm_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str


class OTPSendRequest(BaseModel):
    email: str

class OTPVerifyRequest(BaseModel):
    email: str
    code: str

class PasswordResetRequest(BaseModel):
    email: str
    new_password: str
    confirm_password: str


class PinCreate(BaseModel):
    pin: str = Field(..., min_length=4, max_length=4,
                      examples=['1234'], description="Code PIN numerique (4 chiffres")
    confirm_pin: str = Field(
        ...,
        min_length=4,
        max_length=4,
        examples=["1234"],
        description="Confirmation du code PIN"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "pin": "1234",
                "confirm_pin": "1234"
            }
        }


class PinVerify(BaseModel):
    pin: str = Field(
        ...,
        min_length=4,
        max_length=4,
        examples=['1234'],
        description="Code PIN numerique (4 chiffres)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "pin": "1234"
            }
        }

