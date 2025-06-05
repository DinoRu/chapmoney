import uuid
from typing import List

import httpx
import onesignal_sdk.client
from fastapi import Depends
from sqlalchemy import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.config import settings
from src.db.models import User
from src.db.session import get_session
from src.schemas.notifications import Notification, NotificationCreate

import logging

logger = logging.getLogger(__name__)

ONESIGNAL_APP_ID = settings.ONESIGNALAPPID
ONESIGNAL_API_KEY = settings.ONESIGNALAPIKEY

one_signal_client = onesignal_sdk.client.Client(
	app_id=settings.ONESIGNALAPPID,
	rest_api_key=settings.ONESIGNALAPIKEY
)

def send_notification(notification: Notification):
    notification_body = {
        "app_id": settings.ONESIGNALAPPID,
        "headings": {"en": notification.title},
        "contents": {"en": notification.message},
        "included_segments": ["All"],  # ou utilise include_player_ids
    }
    try:
        response = one_signal_client.send_notification(notification_body)
        return response.status_code == 200
    except onesignal_sdk.error.OneSignalHTTPError as e:
        print(f"OneSignal error: {e}")
        return False


from typing import List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends


async def get_player_ids_for_users(
        user_ids: List[UUID],
        session: AsyncSession = Depends(get_session)
) -> List[str]:
    """
    Récupère les OneSignal player_ids associés à une liste d'utilisateurs.

    Args:
        user_ids (List[UUID]): Liste des identifiants utilisateurs.
        session (AsyncSession): Session de base de données asynchrone.

    Returns:
        List[str]: Liste des player_ids valides.
    """
    if not user_ids:
        return []

    stmt = (
        select(User.onesignal_player_id)
        .where(
            User.id.in_(user_ids),
            User.onesignal_player_id.is_not(None)
        )
    )

    result = await session.execute(stmt)
    return [player_id for (player_id,) in result.all()]


async def send_one_signal_notification(notification: NotificationCreate, session: AsyncSession = Depends(get_session)):
    """
    Envoie une notification push via OneSignal.

    Args:
        notification (NotificationCreate): Données de la notification à envoyer.

    Returns:
        bool: True si la notification a été envoyée avec succès, sinon False.
    """


    headers = {
        "Authorization": f"Key {settings.ONESIGNALAPIKEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "app_id": settings.ONESIGNALAPPID,
        "contents": {"en": notification.message},
        "headings": {"en": notification.title},
        "data": notification.data or {}
    }

    # Détermination des destinataires
    if notification.player_ids:
        payload["include_player_ids"] = notification.player_ids
    elif notification.user_id:
        player_ids = await get_player_ids_for_users([notification.user_id], session)
        if player_ids:
            payload["include_player_ids"] = player_ids

    if "include_player_ids" not in payload:
        logger.warning("Notification ignorée : aucun destinataire valide fourni.")
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://onesignal.com/api/v1/notifications",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            logger.info("Notification envoyée avec succès à OneSignal.")
            return True

    except httpx.HTTPStatusError as e:
        logger.error(f"Erreur OneSignal : {e.response.text}")
        return False
    except Exception as e:
        logger.exception(f"Erreur inattendue lors de l'envoi de la notification : {str(e)}")
        return False