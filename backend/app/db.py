from typing import Optional

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from app.config import get_settings
from app.domain.dietary import parse_allergens, parse_dietary_tags
from app.domain.search import parse_cuisine_tags

_client: Optional[AsyncMongoClient] = None
_db: Optional[AsyncDatabase] = None

# Atlas Search index that powers /search/suggest typeahead. Autocomplete on the
# fields users type against; string mappings let cuisine/city match by token.
SEARCH_INDEX_NAME = "restaurants_autocomplete"
SEARCH_INDEX_DEFINITION = {
    "mappings": {
        "dynamic": False,
        "fields": {
            "name": [{"type": "autocomplete"}, {"type": "string"}],
            "suburb": [{"type": "autocomplete"}, {"type": "string"}],
            "city": {"type": "string"},
            # Atlas string on array path indexes each element.
            "cuisineTags": {"type": "string"},
            "isActive": {"type": "boolean"},
        },
    }
}

_TAG_MIGRATE_FIELDS = {
    "restaurants": ("cuisineTags", "dietaryTags"),
    "menu_items": ("dietaryTags", "allergens"),
}


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


def _tags_for_field(field: str, raw) -> list[str]:
    if field == "cuisineTags":
        return parse_cuisine_tags(raw)
    if field == "dietaryTags":
        return parse_dietary_tags(raw)
    if field == "allergens":
        return parse_allergens(raw)
    return parse_cuisine_tags(raw)


async def ensure_tag_array_fields() -> None:
    """Convert string tag fields on restaurants/menu_items to native arrays."""
    db = get_db()
    for collection_name, fields in _TAG_MIGRATE_FIELDS.items():
        collection = getattr(db, collection_name)
        async for doc in collection.find({}):
            updates: dict = {}
            for field in fields:
                raw = doc.get(field)
                if isinstance(raw, list):
                    continue
                updates[field] = _tags_for_field(field, raw)
            if not updates:
                continue
            doc_id = doc.get("id")
            if doc_id is not None:
                await collection.update_one({"id": doc_id}, {"$set": updates})
            elif doc.get("_id") is not None:
                await collection.update_one({"_id": doc["_id"]}, {"$set": updates})


async def ensure_indexes() -> None:
    """Create indexes that mirror Prisma unique/index constraints."""
    db = get_db()

    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("createdAt")

    await db.addresses.create_index("id", unique=True)
    await db.addresses.create_index("userId")

    await db.restaurants.create_index("id", unique=True)
    await db.restaurants.create_index("slug", unique=True)
    await db.restaurants.create_index("placeId", unique=True, sparse=True)
    await db.restaurants.create_index([("city", ASCENDING), ("isActive", ASCENDING)])
    await db.restaurants.create_index("isActive")
    # Backs the browse/suggest sort: filter active, then rating desc, name asc.
    await db.restaurants.create_index(
        [("isActive", ASCENDING), ("rating", DESCENDING), ("name", ASCENDING)]
    )

    await db.favourites.create_index("id", unique=True)
    await db.favourites.create_index(
        [("userId", ASCENDING), ("restaurantId", ASCENDING)],
        unique=True,
    )
    await db.favourites.create_index([("userId", ASCENDING), ("createdAt", ASCENDING)])

    await db.categories.create_index("id", unique=True)
    await db.categories.create_index("restaurantId")
    await db.categories.create_index(
        [("restaurantId", ASCENDING), ("sortOrder", ASCENDING)],
    )

    await db.menu_items.create_index("id", unique=True)
    await db.menu_items.create_index("categoryId")

    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("userId")
    await db.orders.create_index("restaurantId")
    await db.orders.create_index("createdAt")
    await db.orders.create_index([("userId", ASCENDING), ("createdAt", ASCENDING)])
    await db.orders.create_index("status")

    await db.order_items.create_index("id", unique=True)
    await db.order_items.create_index("orderId")
    await db.order_items.create_index("menuItemId")

    await db.reviews.create_index("id", unique=True)
    await db.reviews.create_index("orderId", unique=True)
    await db.reviews.create_index("userId")
    await db.reviews.create_index("restaurantId")
    await db.reviews.create_index([("restaurantId", ASCENDING), ("createdAt", ASCENDING)])

    await ensure_tag_array_fields()


async def ensure_search_indexes() -> None:
    """Create the restaurants Atlas Search index if the deployment supports it.

    No-op on deployments without Atlas Search (local mongod, the test double):
    the collection simply won't expose the search-index helpers, and any Atlas
    error is swallowed so startup never depends on search being available.
    """
    collection = get_db().restaurants
    create = getattr(collection, "create_search_index", None)
    lister = getattr(collection, "list_search_indexes", None)
    if create is None or lister is None:
        return

    try:
        from pymongo.operations import SearchIndexModel

        async for existing in await lister():
            if existing.get("name") == SEARCH_INDEX_NAME:
                return
        await create(
            SearchIndexModel(
                definition=SEARCH_INDEX_DEFINITION,
                name=SEARCH_INDEX_NAME,
            )
        )
    except PyMongoError:
        # Shared tier without Search, or a transient Atlas error: suggest falls
        # back to the in-memory ranking path, so this is not fatal.
        return
