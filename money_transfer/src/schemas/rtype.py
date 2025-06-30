import uuid
from typing import Optional

from pydantic import BaseModel


class ReceivingTypeBase(BaseModel):
	type: Optional[str] = None
	network: Optional[str] = None
	is_crypto_receiver: bool
	country_id: uuid.UUID


class ReceivingTypeCreate(ReceivingTypeBase):
	pass

class ReceivingTypeRead(ReceivingTypeBase):
	id: uuid.UUID

class ReceivingTypeUpdate(BaseModel):
	type: Optional[str] = None
	network: Optional[str] = None
	is_crypto_receiver: Optional[bool] = None
	country_id: Optional[uuid.UUID] = None
