from itsdangerous import URLSafeTimedSerializer
from pydantic_settings import BaseSettings, SettingsConfigDict
import logging


class Settings(BaseSettings):
    ENV: str = 'local'
    APP_ENV: str
    APP_DEBUG: bool

    DATABASE_URL: str
    DB_URL: str
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    REDIS_URL: str
    REDIS_URL_LOCAL: str
    RABBITMQ_URL: str = "amqp://guest:guest@rabbitmq:5672//"

    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_FROM_NAME: str
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True

    SECRET_KEY: str
    REFRESH_SECRET_KEY: str
    ALGORITHM: str
    TOKEN: str

    FRONTEND_URL: str
    ADMIN_DASHBOARD_URL: str
    ONESIGNALAPPID: str
    ONESIGNALAPIKEY: str

    model_config = SettingsConfigDict(env_file=".env", extra='ignore')

    def active_database_url(self):
        return self.DB_URL if self.ENV == 'docker' else self.DATABASE_URL

    def active_redis_url(self):
        return self.REDIS_URL if self.ENV == 'docker' else self.REDIS_URL_LOCAL

    def active_rabbitmq_url(self):
        return self.RABBITMQ_URL if self.ENV == "docker" else self.REDIS_URL_LOCAL


settings = Settings()

# Celery configuration
CELERY_BROKER_URL = settings.active_rabbitmq_url()
CELERY_BACKEND_URL = settings.REDIS_URL

# Celery Serializer for tokens (e.g., email confirmation)
serializer = URLSafeTimedSerializer(
    secret_key=settings.SECRET_KEY,
    salt="email-configuration"
)

def create_url_safe_token(data: dict) -> str:
    return serializer.dumps(data)

def decode_url_safe_token(token: str):
    try:
        return serializer.loads(token)
    except Exception as e:
        logging.error(f"Token decoding error: {e}")
        return None
