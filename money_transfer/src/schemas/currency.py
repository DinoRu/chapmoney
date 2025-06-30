import uuid
from typing import List, Optional

from pydantic import BaseModel

from src.db.models import PaymentType
from src.schemas.payment_method import PaymentTypeRead
from src.schemas.rtype import ReceivingTypeBase, ReceivingTypeRead

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True


class CurrencyCreate(BaseSchema):
    code: str
    name: Optional[str] = None
    symbol: Optional[str] = None
    is_crypto: bool = False


class CurrencyModel(BaseSchema):
    id: uuid.UUID
    code: str
    name: str
    symbol: str
    is_crypto: bool


class CountryBase(BaseSchema):
    name: str
    code_iso: str
    dial_code: Optional[str] = None
    phone_pattern: Optional[str] = None
    can_send: bool = True
    is_virtual: bool

class CountryCreate(CountryBase):
    currency_id: uuid.UUID

class UpdateCountrySchema(CountryBase):
    pass

class CountryModel(CountryBase):
    id: uuid.UUID
    currency: CurrencyModel
    payment_types: List[PaymentTypeRead] = []
    receiving_types: List[ReceivingTypeRead] = []

