from typing import Optional

from pymongo import ASCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.config import get_settings

_client: Optional[AsyncMongoClient] = None
_db: Optional[AsyncDatabase] = None


def get_client() -> AsyncMongoClient:
    if _client is None:
        raise RuntimeError("MongoDB client is not connected")
    return _client


def get_db() -> AsyncDatabase:
    if _db is None:
        raise RuntimeError("MongoDB database is not connected")
    return _db


async def connect_db() -> AsyncDatabase:
    global _client, _db
    settings = get_settings()
    _client = AsyncMongoClient(settings.mongodb_uri)
    _db = _client[settings.mongodb_db]
    return _db


async def close_db() -> None:
    global _client, _db
    if _client is not None:
        await _client.close()
    _client = None
    _db = None


async def ensure_indexes() -> None:
    """Create indexes that mirror Prisma unique/index constraints."""
    db = get_db()

    await db.users.create_index("email", unique=True)
    await db.users.create_index("createdAt")

    await db.addresses.create_index("userId")

    await db.restaurants.create_index("slug", unique=True)
    await db.restaurants.create_index("placeId", unique=True, sparse=True)
    await db.restaurants.create_index([("city", ASCENDING), ("isActive", ASCENDING)])
    await db.restaurants.create_index("isActive")

    await db.favourites.create_index(
        [("userId", ASCENDING), ("restaurantId", ASCENDING)],
        unique=True,
    )
    await db.favourites.create_index([("userId", ASCENDING), ("createdAt", ASCENDING)])

    await db.categories.create_index("restaurantId")
    await db.categories.create_index(
        [("restaurantId", ASCENDING), ("sortOrder", ASCENDING)],
    )

    await db.menu_items.create_index("categoryId")

    await db.orders.create_index("userId")
    await db.orders.create_index("restaurantId")
    await db.orders.create_index([("userId", ASCENDING), ("createdAt", ASCENDING)])
    await db.orders.create_index("status")

    await db.order_items.create_index("orderId")
    await db.order_items.create_index("menuItemId")

    await db.reviews.create_index("orderId", unique=True)
    await db.reviews.create_index("userId")
    await db.reviews.create_index("restaurantId")
    await db.reviews.create_index([("restaurantId", ASCENDING), ("createdAt", ASCENDING)])
