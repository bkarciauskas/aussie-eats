from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.models import Role, TokenPayload, UserPublic

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(
    *,
    user_id: str,
    email: str,
    name: str,
    role: Role | str,
    settings: Optional[Settings] = None,
    expires_minutes: Optional[int] = None,
) -> str:
    cfg = settings or get_settings()
    expire_delta = timedelta(minutes=expires_minutes or cfg.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "role": Role(role).value,
        "exp": datetime.now(timezone.utc) + expire_delta,
    }
    return jwt.encode(payload, cfg.jwt_secret, algorithm=cfg.jwt_algorithm)


def decode_access_token(token: str, settings: Optional[Settings] = None) -> TokenPayload:
    cfg = settings or get_settings()
    try:
        data = jwt.decode(token, cfg.jwt_secret, algorithms=[cfg.jwt_algorithm])
        return TokenPayload.model_validate(data)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserPublic:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials, settings=settings)
    return UserPublic(
        id=payload.sub,
        email=payload.email,
        name=payload.name,
        role=payload.role,
    )


async def require_admin(
    user: Annotated[UserPublic, Depends(current_user)],
) -> UserPublic:
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
