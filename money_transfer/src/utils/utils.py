from enum import Enum


class TransactionStatus(str, Enum):
    PENDING = "En cours"
    COMPLETED = "Éffectuée"
    CANCELLED = "Annulée" 