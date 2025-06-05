import uuid
from typing import Optional, List

from pydantic import BaseModel, HttpUrl


class NotificationCreate(BaseModel):
    title: str
    message: str
    player_ids: Optional[List[str]] = None
    user_id: Optional[uuid.UUID] = None
    data: Optional[dict] = None

class NotificationSchema(BaseModel):
    title: str
    message: str


class NotificationResponse(BaseModel):
    success: bool
    message: str


class Notification(BaseModel):
    title: str
    message: str

class PromotionNotification(BaseModel):
    title: str
    message: str
    player_ids: Optional[List[str]] = None
    user_ids: Optional[List[uuid.UUID]] = None