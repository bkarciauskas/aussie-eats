from __future__ import annotations

import re
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.deps import CurrentUser, DbDep, SettingsDep
from app.ids import new_id
from app.models import Role, UserPublic
from app.mongo_util import strip_mongo_id
from app.schemas import (
    AuthResponse,
    GuestSessionRequest,
    LoginRequest,
    OkResponse,
    SignupRequest,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _public_user(doc: dict) -> UserPublic:
    return UserPublic(
        id=doc["id"],
        email=doc["email"],
        name=doc["name"],
        role=Role(doc.get("role", Role.CUSTOMER)),
        is_guest=bool(doc.get("isGuest", False)),
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
        "isGuest": False,
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
        is_guest=user.is_guest,
        settings=settings,
    )
    return AuthResponse(access_token=token, user=user)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: DbDep, settings: SettingsDep) -> AuthResponse:
    email = body.email.lower().strip()
    doc = strip_mongo_id(await db.users.find_one({"email": email}))
    if doc is None or not verify_password(body.password, doc.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if doc.get("isGuest"):
        raise HTTPException(
            status_code=401,
            detail="This email was used for guest checkout. Continue as guest at checkout, or sign up with a different email.",
        )

    user = _public_user(doc)
    token = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_guest=user.is_guest,
        settings=settings,
    )
    return AuthResponse(access_token=token, user=user)


@router.post("/guest", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def guest_session(
    body: GuestSessionRequest, db: DbDep, settings: SettingsDep
) -> AuthResponse:
    """Create or resume a lightweight guest owner for checkout (no password)."""
    name = body.name.strip()
    email = body.email.lower().strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    if not email or not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    existing = strip_mongo_id(await db.users.find_one({"email": email}))
    if existing is not None and not existing.get("isGuest"):
        raise HTTPException(
            status_code=409,
            detail="An account with that email already exists. Please log in.",
        )

    if existing is not None:
        await db.users.update_one({"id": existing["id"]}, {"$set": {"name": name}})
        existing["name"] = name
        user = _public_user(existing)
    else:
        user_id = new_id()
        now = datetime.now(timezone.utc)
        # Unusable random secret — guests authenticate via this short-lived session only.
        doc = {
            "id": user_id,
            "email": email,
            "passwordHash": hash_password(secrets.token_urlsafe(32)),
            "name": name,
            "role": Role.CUSTOMER.value,
            "isGuest": True,
            "createdAt": now,
        }
        try:
            await db.users.insert_one(doc)
        except DuplicateKeyError as exc:
            raise HTTPException(
                status_code=409,
                detail="An account with that email already exists. Please log in.",
            ) from exc
        user = _public_user(doc)

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_guest=user.is_guest,
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
