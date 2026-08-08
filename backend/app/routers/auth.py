from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.deps import CurrentUser, DbDep, SettingsDep
from app.ids import new_id
from app.models import Role, UserPublic
from app.mongo_util import strip_mongo_id
from app.schemas import AuthResponse, LoginRequest, OkResponse, SignupRequest
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _public_user(doc: dict) -> UserPublic:
    return UserPublic(
        id=doc["id"],
        email=doc["email"],
        name=doc["name"],
        role=Role(doc.get("role", Role.CUSTOMER)),
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: DbDep, settings: SettingsDep) -> AuthResponse:
    name = body.name.strip()
    email = body.email.lower().strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    if not email or not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    user_id = new_id()
    now = datetime.now(timezone.utc)
    doc = {
        "id": user_id,
        "email": email,
        "passwordHash": hash_password(body.password),
        "name": name,
        "role": Role.CUSTOMER.value,
        "createdAt": now,
    }
    try:
        await db.users.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=409,
            detail="An account with that email already exists.",
        ) from exc

    user = _public_user(doc)
    token = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        settings=settings,
    )
    return AuthResponse(access_token=token, user=user)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: DbDep, settings: SettingsDep) -> AuthResponse:
    email = body.email.lower().strip()
    doc = strip_mongo_id(await db.users.find_one({"email": email}))
    if doc is None or not verify_password(body.password, doc.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user = _public_user(doc)
    token = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        settings=settings,
    )
    return AuthResponse(access_token=token, user=user)


@router.post("/logout", response_model=OkResponse)
async def logout() -> OkResponse:
    # JWT is client-held; callers discard the token after this acknowledgement.
    return OkResponse(ok=True)


@router.get("/me", response_model=UserPublic)
async def me(user: CurrentUser) -> UserPublic:
    return user
