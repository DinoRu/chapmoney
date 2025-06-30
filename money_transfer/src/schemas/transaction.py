import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr
from pydantic.v1 import condecimal, root_validator

from src.schemas.user import UserRead
from src.utils.utils import TransactionStatus


class TransactionBase(BaseModel):
    sender_country: str
    sender_currency: str
    sender_amount: int
    receiver_country: str
    receiver_currency: str
    receiver_amount: int
    conversion_rate: Decimal
    payment_type: str
    recipient_name: str
    recipient_phone: Optional[str]
    recipient_type: Optional[str]
    include_fee: bool
    fee_amount: int
    sender_crypto_address: Optional[str] = None
    receiver_crypto_address: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionRead(TransactionBase):
    id: uuid.UUID
    timestamp: datetime
    status: TransactionStatus
    reference: str
    is_hidden: bool
    sender: UserRead


class TransactionUpdate(BaseModel):
    status: Optional[TransactionStatus] = None


class EmailSchema(BaseModel):
    email: EmailStr
    subject: str
    body: str

class EmailRequest(BaseModel):
    to: EmailStr
    subject: str
    message: str