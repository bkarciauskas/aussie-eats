import os
from datetime import datetime, timezone

# Settings are read at import time via env; set defaults before app imports.
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_DB", "aussieeats_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-at-least-32-characters-long")

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.security import create_access_token, hash_password
from tests.fake_mongo import FakeDB


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def fake_db():
    return FakeDB()


@pytest.fixture
def client(monkeypatch, fake_db):
    async def _noop():
        return None

    monkeypatch.setattr("app.main.connect_db", _noop)
    monkeypatch.setattr("app.main.ensure_indexes", _noop)
    monkeypatch.setattr("app.main.close_db", _noop)
    monkeypatch.setattr("app.deps.get_db", lambda: fake_db)
    monkeypatch.setattr("app.db.get_db", lambda: fake_db)

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def seed_catalog(fake_db):
    now = datetime.now(timezone.utc)
    restaurant = {
        "id": "rest_1",
        "name": "Bondi Burger Co",
        "slug": "bondi-burger-co",
        "description": "Burgers by the beach",
        "image": "/images/restaurants/burger.jpg",
        "cuisineTags": '["Burgers"]',
        "dietaryTags": "[]",
        "city": "Sydney",
        "suburb": "Bondi",
        "lat": -33.8915,
        "lng": 151.2767,
        "deliveryFeeCents": 499,
        "minOrderCents": 1500,
        "isOpen": True,
        "isActive": True,
        "rating": 4.6,
        "placeId": None,
        "userRatingCount": 0,
        "openingHoursJson": None,
        "phone": "+61 2 0000 0000",
        "createdAt": now,
        "updatedAt": now,
    }
    category = {
        "id": "cat_1",
        "restaurantId": "rest_1",
        "name": "Burgers",
        "sortOrder": 0,
    }
    item_cheap = {
        "id": "item_1",
        "categoryId": "cat_1",
        "name": "Classic Beef",
        "description": "Beef burger",
        "priceCents": 1200,
        "image": None,
        "isAvailable": True,
        "dietaryTags": "[]",
        "allergens": "[]",
    }
    item_side = {
        "id": "item_2",
        "categoryId": "cat_1",
        "name": "Fries",
        "description": "Chips",
        "priceCents": 500,
        "image": None,
        "isAvailable": True,
        "dietaryTags": '["vegetarian"]',
        "allergens": "[]",
    }
    fake_db.restaurants.docs.append(restaurant)
    fake_db.categories.docs.append(category)
    fake_db.menu_items.docs.extend([item_cheap, item_side])
    return {
        "restaurant": restaurant,
        "category": category,
        "items": [item_cheap, item_side],
    }


@pytest.fixture
def customer_user(fake_db):
    user = {
        "id": "user_1",
        "email": "demo@aussieeats.local",
        "passwordHash": hash_password("demo1234"),
        "name": "Demo User",
        "role": "CUSTOMER",
        "createdAt": datetime.now(timezone.utc),
    }
    fake_db.users.docs.append(user)
    return user


@pytest.fixture
def admin_user(fake_db):
    user = {
        "id": "admin_1",
        "email": "admin@aussieeats.local",
        "passwordHash": hash_password("admin1234"),
        "name": "Admin",
        "role": "ADMIN",
        "createdAt": datetime.now(timezone.utc),
    }
    fake_db.users.docs.append(user)
    return user


@pytest.fixture
def customer_headers(customer_user):
    token = create_access_token(
        user_id=customer_user["id"],
        email=customer_user["email"],
        name=customer_user["name"],
        role=customer_user["role"],
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user):
    token = create_access_token(
        user_id=admin_user["id"],
        email=admin_user["email"],
        name=admin_user["name"],
        role=admin_user["role"],
    )
    return {"Authorization": f"Bearer {token}"}
