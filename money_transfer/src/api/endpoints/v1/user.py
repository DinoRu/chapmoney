import os.path
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

from fastapi import APIRouter, status, HTTPException, Depends, Request, Security, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select, or_
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, create_reset_token, hash_pin, \
    verify_pin_hash
from src.auth.dependances import get_current_user
from src.auth.permission import admin_required
from src.config import settings
from src.db.models import User, TokenBlacklist, PasswordResetOTP
from src.db.session import get_session
from src.email_service import send_email
from src.schemas.user import UserRead, UserCreate, UserWithToken, UserLogin, UserUpdate, EmailModel, ChangePasswordRequest, ForgotPasswordRequest, \
    ResetPassword, OTPSendRequest, OTPVerifyRequest, PasswordResetRequest, PinCreate, PinVerify
from src.utils.email_utils import send_password_reset_email, send_password_reset_otp

router = APIRouter()

security = HTTPBearer()

PROFILE_PICTURES_DIR = Path("static/profile_pictures")
PROFILE_PICTURES_DIR.mkdir(parents=True, exist_ok=True)

async def get_user_or_phone(user_phone: str, session: Depends(get_session)):
    stmt = select(User).where(User.phone == user_phone)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    return user


async def authenticate_user(credential: str, password: str, session: AsyncSession = Depends(get_session)):
    # Recherche par email OU téléphone
    stmt = select(User).where(or_(
        User.email == credential,
        User.phone == credential
    ))
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiant incorrect")
    if not verify_password(password, user.hash_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mot de passe incorrect")
    return user



@router.post('/sign-up', response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(User).where(User.phone == user.phone)
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    hashed_password = hash_password(user.password)
    user_data = User(**user.dict(exclude={'password'}), hash_password=hashed_password)
    session.add(user_data)
    await session.commit()
    await session.refresh(user_data)

    return user_data


@router.post("/login", response_model=UserWithToken)
async def login(user_data: UserLogin, session: AsyncSession = Depends(get_session)):
    user = await authenticate_user(credential=user_data.credential, password=user_data.password, session=session)
    # if not user:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Identifiants incorrects",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )

    user_read = UserRead.from_orm(user)
    access_token = create_access_token({'sub': str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return UserWithToken(
        **user_read.from_orm(user).model_dump(),
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh-token")
async def refresh_token(request: Request, session: AsyncSession = Depends(get_session)):
    body = await request.json()
    refresh_token = body.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token required")

    # Verifier si le token n'est pas blacklisté
    stmt = select(TokenBlacklist).where(TokenBlacklist.token == refresh_token)
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired")

    payload = decode_token(refresh_token, settings.REFRESH_SECRET_KEY)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_access_token = create_access_token({"sub": user_id})
    return {"access_token": new_access_token}


@router.get("/user-info", status_code=status.HTTP_200_OK, response_model=UserRead)
async def user_info(current_user = Depends(get_current_user)):
    return current_user



@router.get("/", response_model=List[UserRead], dependencies=[Depends(admin_required)])
async def get_all_users(
    session: AsyncSession = Depends(get_session)
):
    stmt = select(User).order_by(User.created_at.desc())
    results = await session.execute(stmt)
    users = results.scalars().all()
    return users


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
        user_data: UserUpdate,
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
):
    user_data_dict = user_data.model_dump(exclude_unset=True)
    for key, value in user_data_dict.items():
        setattr(user, key, value)
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/{user_id}/profile-picture", response_model=UserRead)
async def upload_profile_picture(
        file: UploadFile = File(...),
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
):
    allowed_content_type = ['image/jpeg', "image/png", "image/gif"]
    if file.content_type not in allowed_content_type:
        raise HTTPException(400, "Type de fichier non supporté")

    file_ext = os.path.splitext(file.filename)[1]
    filename = f"user_{user.id}_{int(datetime.now().timestamp())}{file_ext}"
    file_path = PROFILE_PICTURES_DIR / filename

    try:
        with open(file_path, "wb") as buffer:
            content =  await file.read()
            buffer.write(content)
    except IOError:
        raise HTTPException(500, "Erreur lors de l'enregistrement du fichier")

    user.profile_picture_url = f"static/profile_pictures/{filename}"
    user.updated_at = datetime.utcnow()

    try:
        session.add(user)
        await session.commit()
        await session.refresh(user)
    except SQLAlchemyError:
        file_path.unlink(missing_ok=True)
        raise HTTPException(500, detail="Erreur de base de données")
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
):
    await session.delete(user)
    await session.commit()
    return {"message": "Votre compte a été supprimé avec success!"}



@router.post("/logout")
async def logout(
        session: AsyncSession = Depends(get_session),
        credentials: HTTPAuthorizationCredentials = Security(security),
        current_user: User = Depends(get_current_user)
):
    token = credentials.credentials
    payload = decode_token(token, settings.SECRET_KEY)
    if not payload:
        raise HTTPException(
            status_code=400, detail="Token invalid"
        )
    expires_at = datetime.utcfromtimestamp(payload['exp'])

    stmt = select(TokenBlacklist).where(TokenBlacklist.token == token)
    result = await session.execute(stmt)
    existing_token = result.scalar_one_or_none()
    if existing_token:
        raise HTTPException(status_code=400, detail="Token déjà invalidé")

    blacklisted_token = TokenBlacklist(token=token, expires_at=expires_at)
    session.add(blacklisted_token)
    await session.commit()

    return {"message": "Déconnexion réussie"}


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
        password_data: ChangePasswordRequest,
        current_user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
        credentials: HTTPAuthorizationCredentials = Security(security),
):
    if not verify_password(password_data.current_password, current_user.hash_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect"
        )

    if password_data.new_password != password_data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Les nouveaux mots de passe ne correspondent pas.'
        )
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail= "Le mot de passe doit contenir au moins 8 caracteres."
        )

    current_user.hash_password = hash_password(password_data.new_password)

    try:
        session.add(current_user)
        await session.commit()
        await session.refresh(current_user)

        # Invalided le token actual
        token = credentials.credentials
        payload = decode_token(token, settings.SECRET_KEY)
        expires_at = datetime.utcfromtimestamp(payload['exp'])

        blacklisted_token = TokenBlacklist(token=token, expires_at=expires_at)
        session.add(blacklisted_token)
        await session.commit()

        return {"message": "Mot de passe mis à jour avec success"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la mise à jour du mot de passe"
        )

@router.post("/forgot-password")
async def forgot_password(
        request: ForgotPasswordRequest,
        session: AsyncSession = Depends(get_session)
):
    stmt = select(User).where(User.email == request.email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        reset_token = create_reset_token(
            {'sub': str(user.id), 'type': "password_reset"},
            expires_delta=timedelta(minutes=15)
        )
        reset_link = f"http://{settings.FRONTEND_URL}/auth/password-reset-confirm?token={reset_token}"
        send_password_reset_email.delay(user_email=user.email, reset_link=reset_link)

    return {"message": "Si l'email existe, un lien de réinitialisation a été envoyé"}



@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_account(
        session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Suppression de compte
        await session.delete(current_user)
        await session.commit()

        token = credentials.credentials
        expire_at = datetime.utcfromtimestamp(decode_token(token, settings.SECRET_KEY)['exp'])
        blacklisted_token = TokenBlacklist(token=token, expire_at=expire_at)
        session.add(blacklisted_token)
        await session.commit()

        return {"message": "Compte supprimé avec succès"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la suppression du compte"
        )


@router.post("/request-otp")
async def send_otp(request: OTPSendRequest, session: AsyncSession = Depends(get_session)):
    stmt = select(User).where(User.email == request.email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte associé à cet email")

    # Générer OTP (6 chiffre)
    otp_code = "".join(random.choices("0123456789", k=6))
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    # Stocker en base
    otp_record = PasswordResetOTP(
        email=request.email,
        code=otp_code,
        expires_at=expires_at
    )
    session.add(otp_record)
    await session.commit()

    # Envoyer par email (version dev)
    print(f'OTP pour {request.email}: {otp_code}')

    # En prod: send_email
    send_password_reset_otp.delay(user_email=user.email, otp_code=otp_code)

    return {"message": "Code OTP envoyé"}


@router.post("/verify-otp")
async def verify_otp(request: OTPVerifyRequest, session: AsyncSession = Depends(get_session)):
    stmt = select(PasswordResetOTP).where(
        PasswordResetOTP.email == request.email,
        PasswordResetOTP.expires_at > datetime.utcnow(),
        PasswordResetOTP.used == False
    ).order_by(PasswordResetOTP.created_at.desc())

    result = await session.execute(stmt)
    otp_record = result.scalar_one_or_none()

    if not otp_record or otp_record.code != request.code:
        raise HTTPException(status_code=400, detail="Code invalide ou expiré")

    # Marquer le code comme utilisé
    otp_record.used = True
    await session.commit()

    return {'success': True, "token": create_access_token({"email": request.email})}


@router.post('/reset-password')
async def reset_password(request:  PasswordResetRequest, session: AsyncSession = Depends(get_session)):
    # Validation des mots de passe
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas")

    #recupérer l'utilisateur
    stmt = select(User).where(User.email == request.email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Mettre à jour le mot de passe
    user.hash_password = hash_password(request.new_password)

    await session.commit()

    return {'message': "Mot de passe reinitialisé avec succès"}


@router.post('/pin', status_code=status.HTTP_200_OK)
async def set_pin(
        pin_data: PinCreate,
        current_user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
):
    if len(pin_data.pin) != 4:
        raise HTTPException(400, detail="Le PIN doit contenir 4 chiffres")

    current_user.pin_hash = hash_pin(pin_data.pin)
    await session.commit()
    await session.refresh(current_user)
    return {"message": "PIN défini avec succès"}


@router.post("/verify-pin", status_code=status.HTTP_200_OK)
async def verify_pin(
        pin_data: PinVerify,
        current_user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session)
):
    await session.refresh(current_user, ['pin_hash'])

    if not current_user.pin_hash:
        raise HTTPException(400, detail="Aucun PIN défini")

    if not verify_pin_hash(pin_data.pin, current_user.pin_hash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PIN incorrect")

    return {"success": True}