import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Annotated

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import APIRouter, status, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi_mail import ConnectionConfig, MessageSchema, FastMail
from sqlalchemy import or_
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from sqlmodel import select
from starlette.responses import JSONResponse

from src.auth.dependances import get_current_user
from src.auth.permission import agent_or_admin_required, admin_required
from src.config import settings
from src.db.models import Transaction, TransactionStatus, User
from src.db.session import get_session
from src.schemas.notifications import Notification, NotificationResponse, NotificationSchema, NotificationCreate, PromotionNotification
from src.schemas.transaction import TransactionRead, TransactionCreate, TransactionUpdate, EmailRequest, EmailSchema
from src.firebase import messaging
from src.utils.email_utils import send_transaction_email
from src.utils.notification_utils import send_notification, send_one_signal_notification, get_player_ids_for_users

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()


async def get_transaction_or_404(id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    stmt = select(Transaction).options(selectinload(Transaction.sender)).where(Transaction.id == id)
    result = await session.execute(stmt)
    transaction = result.scalar_one_or_none()
    return transaction


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=TransactionRead)
async def create_transaction(
        transaction_data: TransactionCreate,
        sender: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
):
    transaction = Transaction(**transaction_data.dict(), sender_id=sender.id)
    session.add(transaction)
    await session.commit()
    await session.refresh(transaction)

    #Envoyer la notification
    await manager.broadcast({
        "type": "NEW_TRANSACTION",
        "data": {
            "id": str(transaction.id),
            "reference": transaction.reference,
            "amount": float(transaction.sender_amount),
            "currency": transaction.sender_currency,
            "status": transaction.status
        }
    })

    send_transaction_email.delay(transaction.id)
    return transaction


@router.websocket("/ws/transactions")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.get("/", response_model=List[TransactionRead])
async def get_transactions(
        status: Optional[TransactionStatus] = None,
        page: int = 1,
        limit: int = 100,
        session: AsyncSession = Depends(get_session)
):
    stmt = select(Transaction).options(selectinload(Transaction.sender)).order_by(Transaction.timestamp.desc())

    if status:
        stmt = stmt.where(Transaction.status == status)

    results = await session.execute(stmt.offset((page-1)*limit).limit(limit))
    transactions = results.scalars().all()
    return transactions


@router.get("/me/transactions", status_code=status.HTTP_200_OK, response_model=List[TransactionRead])
async def get_user_transactions(
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
        page: int = 1,
        limit: int = 100,
        status: Optional[TransactionStatus] = None
):

    stmt =  select(Transaction)\
            .options(selectinload(Transaction.sender)) \
            .where(Transaction.sender_id == user.id) \
            .where(Transaction.is_hidden == False)

    if status:
        stmt = stmt.where(Transaction.status == status)

    stmt = stmt.order_by(Transaction.timestamp.desc())\
            .offset((page - 1) * limit) \
            .limit(limit)
    results = await session.execute(stmt)
    transactions = results.scalars().all()

    return transactions


@router.get("/search")
async def search_transactions(
    q: str = None,
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    query = select(Transaction).options(
        joinedload(Transaction.sender),
    )

    if q:
        query = query.where(
            or_(
                Transaction.reference.ilike(f"%{q}%"),
                Transaction.sender.has(User.full_name.ilike(f"%{q}%")),
                Transaction.sender.has(User.phone.ilike(f"%{q}%")),
                Transaction.recipient_name.ilike(f"%{q}%"),
                Transaction.recipient_phone.ilike(f"%{q}%")
            )
        )

    if status:
        query = query.where(Transaction.status == status)

    if start_date:
        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.where(Transaction.timestamp >= start_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Format de date invalide (utilisez YYYY-MM-DD)"
            )

    if end_date:
        try:
            end_date = datetime.strptime(end_date, "%Y-%m-%d")
            query = query.where(Transaction.timestamp <= end_date + timedelta(days=1))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Format de date invalide (utilisez YYYY-MM-DD)"
            )

    result = await session.execute(query)
    transactions = result.scalars().all()

    return [{
        "id": str(transaction.id),
        "reference": transaction.reference,
        "sender": {
            "id": str(transaction.sender.id),
            "full_name": transaction.sender.full_name,
            "phone": transaction.sender.phone
        },
        "status": transaction.status,
        "sender_amount": transaction.sender_amount,
        "sender_currency": transaction.sender_currency,
        "receiver_amount": transaction.receiver_amount,
        "receiver_currency": transaction.receiver_currency,
        "timestamp": transaction.timestamp.isoformat(),
        "recipient_name": transaction.recipient_name,
        "recipient_phone": transaction.recipient_phone
    } for transaction in transactions]


@router.post("/notify/promotion", status_code=status.HTTP_200_OK)
async def send_promotion_notification(
        payload: PromotionNotification,
        session: AsyncSession = Depends(get_session)
):
    recipient_ids = payload.player_ids or []

    # Si user_ids fournis, on les transforme en player_ids
    if payload.user_ids:
        player_ids = await get_player_ids_for_users(payload.user_ids, session)
        recipient_ids.extend(player_ids)

    if not recipient_ids:
        raise HTTPException(
            status_code=400,
            detail="Aucun destinataire (player_ids ou user_ids) fourni."
        )

    onesignal_payload = {
        "app_id": settings.ONESIGNALAPPID,
        "include_player_ids": recipient_ids,
        "contents": {"en": payload.message},
        "headings": {"en": payload.title},
        # "big_picture": str(payload.image_url),  # Android
        # "ios_attachments": {
        #     "id": str(payload.image_url)  # iOS
        # },
        "data": {
            "type": "promotion"
        }
    }

    headers = {
        "Authorization": f"Key {settings.ONESIGNALAPIKEY}",
        "Content-Type": "application/json"
    }

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://onesignal.com/api/v1/notifications",
                json=onesignal_payload,
                headers=headers
            )
            response.raise_for_status()
            logger.info("Notification promotionnelle envoyée.")
            return {"status": "sent"}
    except httpx.HTTPStatusError as e:
        logger.error(f"Erreur OneSignal: {e.response.text}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de la notification.")


@router.get("/{id}", response_model=TransactionRead, status_code=status.HTTP_200_OK)
async def get_transaction(
        transaction = Depends(get_transaction_or_404)
):
    return transaction


@router.post("/{id}/notify", status_code=status.HTTP_200_OK)
async def send_transaction_notification(
        background_tasks: BackgroundTasks,
        transaction = Depends(get_transaction_or_404),
        currency_user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
):
    if transaction.status == TransactionStatus.COMPLETED:
        notification = NotificationCreate(
            title="Transaction validée",
            message=f"Votre transaction {transaction.reference} a été validée",
            user_id=transaction.sender_id,
            data={
                "type": "transaction",
                "transaction_id": str(transaction.id),
                "status": "validé"
            }
        )
    await send_one_signal_notification(notification, session)
    return {"status": "notification_queued"}


@router.patch("/{id}", response_model=TransactionRead, dependencies=[Depends(admin_required)])
async def update_transaction_status(
        update_data: TransactionUpdate,
        transaction = Depends(get_transaction_or_404),
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
):
    previous_status = transaction.status
    if update_data.status:
        transaction.status = update_data.status
    session.add(transaction)
    await session.commit()
    await session.refresh(transaction)

    # Envoyer une notification
    if previous_status != transaction.status:
        await manager.broadcast({
            "type": "STATUS_CHANGE",
            "data": {
                "id": str(transaction.id),
                "reference": transaction.reference,
                "old_status": previous_status,
                "new_status": transaction.status
            }
        })
    return transaction



@router.get('/{reference}', response_model=TransactionRead)
async def get_transaction_by_reference_or_404(reference: str, session: AsyncSession = Depends(get_session)):
    stmt = select(Transaction).where(Transaction.reference == reference)
    result = await session.execute(stmt)
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
        transaction = Depends(get_transaction_or_404),
        session: AsyncSession = Depends(get_session)
):
    transaction.is_hidden = True
    await session.commit()
    await session.refresh(transaction)
    return {"message": "Transaction supprimée avec succès"}
