import os
import logging
from celery import Celery
from kombu import Connection
from dotenv import load_dotenv

from src.config import settings

# Configuration du logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Test de connexion RabbitMQ
# rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672//")
rabbitmq_url = settings.RABBITMQ_URL

try:
    with Connection(rabbitmq_url) as conn:
        conn.connect()
        logger.info("✅ Connexion RabbitMQ réussie")
except Exception as e:
    logger.error(f"❌ Erreur connexion RabbitMQ: {str(e)}")
    raise

# Configuration Celery
celery_app = Celery(
    'tasks',
    broker=rabbitmq_url,
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)

# Configuration supplémentaire
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)