import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Configuration Celery
celery_app = Celery(
    'tasks',
    broker=os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672//"),
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
)