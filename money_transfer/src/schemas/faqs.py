import uuid
from typing import Optional

from pydantic import BaseModel


class FAQBase(BaseModel):
	question: str
	answer: str


class CreateFAQ(FAQBase):
	pass


class UpdateFAQ(BaseModel):
	question: Optional[str] = None
	answer: Optional[str] = None


class ReadFAQ(FAQBase):
	id: uuid.UUID