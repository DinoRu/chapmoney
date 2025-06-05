import enum
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
import random
from typing import List, Optional

from sqlalchemy import Index, UniqueConstraint
from sqlmodel import SQLModel, Field, Column, DECIMAL, Relationship
import sqlalchemy.dialects.postgresql as pg

from src.utils.utils import TransactionStatus


class UserRole(str, Enum):
    ADMIN = 'admin'
    USER = 'user'
    AGENT = 'agent'



class TokenBlacklist(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    expires_at: datetime


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(sa_column=Column(pg.UUID, primary_key=True, default=uuid.uuid4))
    full_name: str = Field(sa_column=Column(pg.VARCHAR))
    phone: str = Field(sa_column=Column(pg.VARCHAR, unique=True))
    email: str = Field(sa_column=Column(pg.VARCHAR, unique=True))

    country: str = Field(sa_column=Column(pg.VARCHAR, nullable=False))

    hash_password: str = Field(sa_column=Column(pg.VARCHAR, nullable=False), exclude=True)

    role: UserRole = Field(default=UserRole.USER, sa_column=Column(pg.VARCHAR, nullable=False))
    profile_picture_url: Optional[str] = Field(sa_column=Column(pg.VARCHAR, nullable=True))


    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(pg.TIMESTAMP(timezone=True), default=datetime.utcnow))
    updated_at: datetime = Field(default_factory=datetime.utcnow,
                                 sa_column=Column(pg.TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow))

    pin_hash: Optional[str] = Field(default=None, sa_column=Column(pg.VARCHAR, nullable=True), description="Hash du code PIN", exclude=True)
    onesignal_player_id: Optional[str] = Field(
        default=None,
        sa_column=Column(pg.VARCHAR, nullable=True),
        description="ID de l'appareil pour les notification push onesignal"
    )

    transactions: List["Transaction"] = Relationship(back_populates='sender', cascade_delete=True)

    @property
    def pin_set(self) -> bool:
        return self.pin_hash is not None


class Currency(SQLModel, table=True):
    __tablename__ = "currencies"
    id: uuid.UUID = Field(sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4))
    code: str = Field(sa_column=Column(pg.VARCHAR, nullable=False, unique=True))
    name: str = Field(sa_column=Column(pg.VARCHAR, nullable=False))
    symbol: str = Field(sa_column=Column(pg.VARCHAR, nullable=False, unique=True))

    countries: List["Country"] = Relationship(back_populates='currency')


class Country(SQLModel, table=True):
    __tablename__ = 'countries'
    id:uuid.UUID = Field(sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4))
    name: str = Field(sa_column=Column(pg.VARCHAR, nullable=False, unique=True))
    code_iso: str = Field(sa_column=Column(pg.VARCHAR(2), nullable=False, unique=True))
    currency_id: uuid.UUID = Field(foreign_key='currencies.id', nullable=False)
    dial_code: str = Field(sa_column=Column(pg.VARCHAR(4)))
    phone_pattern: str = Field(sa_column=Column(pg.VARCHAR))
    can_send: bool = Field(
        sa_column=Column(pg.BOOLEAN, nullable=False, server_default='true'),
        description="Détermine si le pays peut envoyer de l'argent"
    )
    currency: "Currency" = Relationship(back_populates='countries')
    payment_types: List["PaymentType"] = Relationship(back_populates="country", cascade_delete=True)
    receiving_types: List["ReceivingType"] = Relationship(back_populates="country", cascade_delete=True)


class Rate(SQLModel, table=True):
    __tablename__ = "rates"
    __table_args__ = (Index('idx_rate', 'rate'), )
    id: uuid.UUID = Field(sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4))
    currency: str = Field(sa_column=Column(pg.VARCHAR, nullable=False, index=True))
    rate: Decimal = Field(sa_column=Column(DECIMAL(precision=10, scale=2), nullable=False))


class ReceivingType(SQLModel, table=True):
    __tablename__ = "receiving_type"
    __table_args__ = (Index('idx_receiving_type', 'type'),)
    id: uuid.UUID = Field(sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4))
    type: str = Field(sa_column=Column(pg.VARCHAR, nullable=False))
    country_id: uuid.UUID = Field(foreign_key='countries.id')

    country: "Country" = Relationship(back_populates="receiving_types")


class PaymentType(SQLModel, table=True):
    __tablename__ = "payment_type"
    __table_args__ = (Index('idx_payment_type', 'type'),)

    id: uuid.UUID = Field(sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4))
    type: str = Field(sa_column=Column(pg.VARCHAR(50), nullable=False))
    owner_full_name: str = Field(sa_column=Column(pg.VARCHAR(50), nullable=False))
    phone_number: str | None = Field(sa_column=Column(pg.VARCHAR(20), default=None))
    account_number: str | None = Field(sa_column=Column(pg.VARCHAR(20), default=None))
    country_id: uuid.UUID = Field(foreign_key="countries.id")
    country: "Country" = Relationship(back_populates="payment_types")




def generate_reference():
    return f"{random.randint(10**7, 10**8 - 1)}"

class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("idx_transaction_status", "status"),
        Index("idx_transaction_reference", "reference")
    )

    id: uuid.UUID = Field(sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4))
    timestamp: datetime = Field(sa_column=Column(pg.TIMESTAMP(timezone=True), default=datetime.now))
    reference: str = Field(sa_column=Column(pg.VARCHAR(8), unique=True), default_factory=generate_reference)
    sender_id: uuid.UUID = Field(foreign_key="users.id")
    sender_country: str = Field(sa_column=Column(pg.VARCHAR(50), nullable=False))
    sender_currency: str = Field(sa_column=Column(pg.VARCHAR(10), nullable=False))
    sender_amount: int = Field(sa_column=Column(pg.INTEGER))
    receiver_country: str = Field(sa_column=Column(pg.VARCHAR(50)))
    receiver_currency: str = Field(sa_column=Column(pg.VARCHAR(10)))
    receiver_amount: int = Field(sa_column=Column(pg.INTEGER))
    conversion_rate: Decimal = Field(sa_column=Column(DECIMAL(precision=10, scale=2)))
    payment_type: str = Field(sa_column=Column(pg.VARCHAR(50)))
    recipient_name: str = Field(sa_column=Column(pg.VARCHAR(50)))
    recipient_phone: str = Field(sa_column=Column(pg.VARCHAR(50)))
    recipient_type: str = Field(sa_column=Column(pg.VARCHAR(50)))
    include_fee: bool = Field(sa_column=Column(pg.BOOLEAN, default=False))
    is_hidden: bool = Field(sa_column=Column(pg.BOOLEAN, default=False), default=False)
    fee_amount: int = Field(sa_column=Column(pg.INTEGER, nullable=False, default="0"))
    status: TransactionStatus = Field(sa_column=Column(pg.VARCHAR(20), nullable=False), default=TransactionStatus.PENDING)

    sender: User = Relationship(back_populates='transactions')


class Fee(SQLModel, table=True):
    __tablename__ = 'fees'
    __table_args__ = (Index('idx_from_to', 'from_country_id', 'to_country_id'),)

    id: uuid.UUID = Field(sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4))
    from_country_id: uuid.UUID = Field(foreign_key='countries.id', nullable=False, ondelete='CASCADE')
    to_country_id: uuid.UUID = Field(foreign_key='countries.id', nullable=False, ondelete='CASCADE')
    fee: Decimal = Field(sa_column=Column(DECIMAL(precision=10, scale=2), nullable=False))




class ExchangeRates(SQLModel, table=True):
    __tablename__ = "ex_rates"
    __table_args__ = (
        Index("idx_from_to_currency", "from_currency_id", "to_currency_id"),
        UniqueConstraint('from_currency_id', 'to_currency_id', name='unique_currency_pair'),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, sa_column=Column(pg.UUID, primary_key=True))
    from_currency_id: uuid.UUID = Field(foreign_key='currencies.id', nullable=False)
    to_currency_id: uuid.UUID = Field(foreign_key='currencies.id', nullable=False)
    rate: Decimal = Field(sa_column=Column(DECIMAL, nullable=False))

    from_currency: Currency = Relationship(sa_relationship_kwargs={'foreign_keys': "[ExchangeRates.from_currency_id]"})
    to_currency: Currency = Relationship(sa_relationship_kwargs={"foreign_keys": "[ExchangeRates.to_currency_id]"})


class FAQs(SQLModel, table=True):
    __tablename__ = "faqs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, sa_column=Column(pg.UUID, primary_key=True))
    question: str = Field(sa_column=Column(pg.VARCHAR, nullable=False))
    answer: str = Field(sa_column=Column(pg.VARCHAR, nullable=False))


class PasswordResetOTP(SQLModel, table=True):
    id: uuid.UUID | None = Field(primary_key=True, default_factory=uuid.uuid4)
    email: str
    code: str = Field(max_length=6)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    used: bool = False
