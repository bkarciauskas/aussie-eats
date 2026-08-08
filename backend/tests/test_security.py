import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.config import Settings
from app.models import Role
from app.security import (
    create_access_token,
    current_user,
    decode_access_token,
    hash_password,
    require_admin,
    verify_password,
)


@pytest.fixture
def settings() -> Settings:
    return Settings(
        mongodb_uri="mongodb://localhost:27017",
        mongodb_db="aussieeats_test",
        jwt_secret="unit-test-secret-key-32chars-min!!",
        jwt_expire_minutes=60,
    )


def test_hash_and_verify_password_roundtrip():
    hashed = hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong-password", hashed)


def test_verify_password_rejects_malformed_hash():
    assert not verify_password("anything", "not-a-bcrypt-hash")


def test_create_and_decode_access_token(settings: Settings):
    token = create_access_token(
        user_id="user_123",
        email="demo@aussieeats.local",
        name="Demo User",
        role=Role.CUSTOMER,
        settings=settings,
    )
    payload = decode_access_token(token, settings=settings)
    assert payload.sub == "user_123"
    assert payload.email == "demo@aussieeats.local"
    assert payload.name == "Demo User"
    assert payload.role == Role.CUSTOMER


def test_create_access_token_accepts_role_string(settings: Settings):
    token = create_access_token(
        user_id="admin_1",
        email="admin@aussieeats.local",
        name="Admin",
        role="ADMIN",
        settings=settings,
    )
    payload = decode_access_token(token, settings=settings)
    assert payload.role == Role.ADMIN


def test_decode_rejects_invalid_token(settings: Settings):
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("not.a.jwt", settings=settings)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid token"


def test_decode_rejects_expired_token(settings: Settings):
    import jwt

    expired = jwt.encode(
        {
            "sub": "user_123",
            "email": "demo@aussieeats.local",
            "name": "Demo User",
            "role": Role.CUSTOMER.value,
            "exp": 1,
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(expired, settings=settings)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token has expired"


@pytest.mark.asyncio
async def test_current_user_from_bearer_token(settings: Settings):
    token = create_access_token(
        user_id="user_123",
        email="demo@aussieeats.local",
        name="Demo User",
        role=Role.CUSTOMER,
        settings=settings,
    )
    user = await current_user(
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=token),
        settings,
    )
    assert user.id == "user_123"
    assert user.role == Role.CUSTOMER


@pytest.mark.asyncio
async def test_current_user_requires_credentials(settings: Settings):
    with pytest.raises(HTTPException) as exc_info:
        await current_user(None, settings)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_require_admin_allows_admin():
    from app.models import UserPublic

    admin = UserPublic(
        id="admin_1",
        email="admin@aussieeats.local",
        name="Admin",
        role=Role.ADMIN,
    )
    assert await require_admin(admin) == admin


@pytest.mark.asyncio
async def test_require_admin_rejects_customer():
    from app.models import UserPublic

    customer = UserPublic(
        id="user_1",
        email="demo@aussieeats.local",
        name="Demo",
        role=Role.CUSTOMER,
    )
    with pytest.raises(HTTPException) as exc_info:
        await require_admin(customer)
    assert exc_info.value.status_code == 403
