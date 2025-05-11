import logging
from datetime import timedelta, datetime

from itsdangerous import URLSafeTimedSerializer
from jose import jwt, JWTError
from passlib.context import CryptContext

from src.config import settings


ACCESS_TOKEN_EXPIRE_MINUTE = 60 * 24
REFRESH_TOKEN_EXPIRE_DAYS = 30
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str):
	return pwd_context.hash(password)

def verify_password(plain, hashed_password):
	return pwd_context.verify(plain, hashed_password)


def hash_pin(pin: str) -> str:
	return pwd_context.hash(pin)

def verify_pin_hash(plain_pin: str, hashed_pin: str) -> bool:
	return pwd_context.verify(plain_pin, hashed_pin)

def create_token(data: dict, expires_delta: timedelta, secret_key: str):
	to_encode = data.copy()
	expire = datetime.utcnow() + expires_delta
	to_encode.update({'exp': expire})
	return jwt.encode(to_encode, secret_key, algorithm=settings.ALGORITHM)

def create_access_token(data: dict) -> str:
	return create_token(data, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTE), settings.SECRET_KEY)

def create_refresh_token(data: dict) -> str:
	return create_token(data, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), secret_key=settings.REFRESH_SECRET_KEY)

def create_reset_token(data: dict, expires_delta: timedelta):
	return create_token(data=data, expires_delta=expires_delta, secret_key=settings.SECRET_KEY)

def decode_token(token: str, secret_key: str) -> dict | None:
	try:
		payload = jwt.decode(token, secret_key, algorithms=[settings.ALGORITHM])
		return payload
	except JWTError:
		return None



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

