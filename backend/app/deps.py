from typing import Annotated, Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials
from pymongo.asynchronous.database import AsyncDatabase

from app.config import Settings, get_settings
from app.db import get_db
from app.models import UserPublic
from app.security import bearer_scheme, current_user, decode_access_token, require_admin


def database() -> AsyncDatabase:
    return get_db()


DbDep = Annotated[AsyncDatabase, Depends(database)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
CurrentUser = Annotated[UserPublic, Depends(current_user)]
AdminUser = Annotated[UserPublic, Depends(require_admin)]


async def optional_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    settings: SettingsDep,
) -> Optional[UserPublic]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    payload = decode_access_token(credentials.credentials, settings=settings)
    return UserPublic(
        id=payload.sub,
        email=payload.email,
        name=payload.name,
        role=payload.role,
    )


OptionalUser = Annotated[Optional[UserPublic], Depends(optional_current_user)]
