import logging

from itsdangerous import URLSafeTimedSerializer
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	ENV: str = 'local'
	APP_ENV: str
	APP_DEBUG: bool
	DATABASE_URL: str
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
	TOKEN:str
	SECRET_KEY: str
	ALGORITHM: str
	REFRESH_SECRET_KEY:str
	REDIS_URL: str
	REDIS_URL_LOCAL: str
	POSTGRES_DB: str
	POSTGRES_USER: str
	POSTGRES_PASSWORD: str
	POSTGRES_HOST: str
	POSTGRES_PORT: int
	DB_URL: str
	FRONTEND_URL: str
	ADMIN_DASHBOARD_URL:str

	model_config = SettingsConfigDict(env_file=".env", extra='ignore')

	def active_database_url(self):
		return self.DB_URL if self.ENV == 'docker' else self.DATABASE_URL

	def active_redis_url(self):
		return self.REDIS_URL if self.ENV == 'docker' else self.REDIS_URL_LOCAL


settings = Settings()

CELERY_BROKER_URL = settings.active_redis_url()
CELERY_BACKEND_URL = settings.active_redis_url()
broker_connection_retry_on_startup = True

serializer = URLSafeTimedSerializer(
	secret_key=settings.SECRET_KEY, salt="email-configuration"
)

def create_url_safe_token(data: dict):
	token = serializer.dumps(data)
	return token

def decode_url_safe_token(token: str):
	try:
		token_data = serializer.loads(token)
		return token_data
	except Exception as e:
		logging.error(str(e))
		return None
