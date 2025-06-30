from pydantic import BaseModel, field_validator, model_validator
import uuid
from typing import Optional


class PaymentTypeBase(BaseModel):
    is_crypto_pay: bool
    type: Optional[str] = None
    network: Optional[str] = None
    owner_full_name: str
    phone_number: Optional[str] = None
    account_number: Optional[str] = None
    crypto_address: Optional[str] = None
    country_id: uuid.UUID

    @model_validator(mode="after")
    def validate_payment_method(self) -> "PaymentTypeBase":
        if self.is_crypto_pay:
            if not self.network:
                raise ValueError("Le champ 'network' est requis pour un paiement crypto.")
            if not self.crypto_address:
                raise ValueError("Crypto address is required for crypto payment type")
            if self.phone_number or self.account_number or self.type:
                raise ValueError("Type, Phone number and account number should not be provided for crypto payment type")
        else:
            if not self.phone_number and not self.account_number and not self.type:
                raise ValueError("Type, Phone number or account number must be provided")
            if self.crypto_address:
                raise ValueError("Crypto address should only be provided for crypto payment type")
        return self


class PaymentTypeCreate(PaymentTypeBase):
    pass


class PaymentTypeRead(PaymentTypeBase):
    id: uuid.UUID


class PaymentTypeUpdate(BaseModel):
    is_crypto_pay: Optional[bool] = None
    type: Optional[str] = None
    network: Optional[str] = None
    owner_full_name: Optional[str] = None
    phone_number: Optional[str] = None
    account_number: Optional[str] = None
    crypto_address: Optional[str] = None
    country_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def validate_update(self) -> "PaymentTypeUpdate":
        if not any([
            self.is_crypto_pay,
            self.type, self.network, self.owner_full_name,
            self.phone_number, self.account_number,
            self.crypto_address, self.country_id
        ]):
            raise ValueError("At least one field must be updated")

        if self.is_crypto_pay is True or self.crypto_address or self.network:
            if self.phone_number or self.account_number or self.type:
                raise ValueError("Type/Phone/account cannot be set for crypto payment type")

        return self
