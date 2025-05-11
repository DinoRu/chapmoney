from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.auth import decode_token
from src.config import settings
from src.db.models import User, TokenBlacklist
from src.db.session import get_session

security  = HTTPBearer()

async def get_user_or_id(user_id: str, session: AsyncSession = Depends(get_session)):
	stmt = select(User).where(User.id == user_id)
	result = await session.execute(stmt)
	return result.scalar_one_or_none()

async def get_current_user(
		credentials: HTTPAuthorizationCredentials = Security(security),
		session: AsyncSession = Depends(get_session)
) -> User:
	credentials_exception = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Impossible de valider les identifants",
		headers={"WWW-Authenticate": "Bearer"}
	)
	try:
		token = credentials.credentials
		payload = decode_token(token, settings.SECRET_KEY)
		if not payload:
			raise credentials_exception

		stmt = select(TokenBlacklist).where(TokenBlacklist.token == token)
		result = await session.execute(stmt)
		black_token = result.scalar_one_or_none()
		if black_token:
			raise HTTPException(status_code=401, detail="Token révoqué")

		user_id = payload.get("sub")
		if user_id is None:
			raise credentials_exception
	except JWTError:
		raise credentials_exception
	user = await get_user_or_id(user_id=user_id, session=session)

	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	return user

