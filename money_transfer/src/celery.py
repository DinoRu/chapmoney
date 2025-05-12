from celery import Celery
from src.config import CELERY_BROKER_URL, CELERY_BACKEND_URL

celery_app = Celery("ChapMoney App", broker=CELERY_BROKER_URL, backend=CELERY_BACKEND_URL)

celery_app.conf.update(
    broker_connection_retry_on_startup=True,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

import src.utils.email_utils
