import json
from datetime import datetime, timezone

import pytest

from app import seed as seed_module
from app.catalog_snapshot import (
    build_snapshot_payload,
    resolve_restaurant_image,
    restore_catalog_snapshot,
    write_snapshot,
)
from app.domain.tag_menu_item import tag_menu_item
from tests.fake_mongo import FakeDB


@pytest.mark.asyncio
async def test_ensure_users_upserts_demo_and_admin(monkeypatch):
    db = FakeDB()

    customers = await seed_module.ensure_users(db)
    assert any(c["email"] == "demo@aussieeats.local" for c in customers)
    admin = await db.users.find_one({"email": "admin@aussieeats.local"})
    assert admin is not None
    assert admin["role"] == "ADMIN"
    assert await db.users.count_documents({}) == 10

    # Re-seed is upsert: count stays stable, name updates apply.
    await db.users.update_one(
        {"email": "demo@aussieeats.local"},
        {"$set": {"name": "Stale Name"}},
    )
    await seed_module.ensure_users(db)
    demo = await db.users.find_one({"email": "demo@aussieeats.local"})
    assert demo is not None
    assert demo["name"] == "Demo Customer"
    assert await db.users.count_documents({}) == 10


@pytest.mark.asyncio
async def test_bootstrap_loads_handwritten_when_no_snapshot(tmp_path):
    db = FakeDB()
    missing = tmp_path / "missing_catalog_snapshot.json"

    await seed_module.bootstrap_catalog_if_empty(db, snapshot_path=missing)
    first_count = await db.restaurants.count_documents({})
    assert first_count > 0
    assert await db.categories.count_documents({}) > 0
    assert await db.menu_items.count_documents({}) > 0

    harbour = await db.restaurants.find_one({"slug": "harbour-burger-co"})
    assert harbour is not None
    original_id = harbour["id"]

    await seed_module.bootstrap_catalog_if_empty(db, snapshot_path=missing)
    assert await db.restaurants.count_documents({}) == first_count
    harbour_again = await db.restaurants.find_one({"slug": "harbour-burger-co"})
    assert harbour_again is not None
    assert harbour_again["id"] == original_id


@pytest.mark.asyncio
async def test_bootstrap_restores_snapshot_when_empty(tmp_path):
    db = FakeDB()
    now = datetime.now(timezone.utc).isoformat()
    snapshot_path = tmp_path / "catalog_snapshot.json"
    write_snapshot(
        snapshot_path,
        build_snapshot_payload(
            restaurants=[
                {
                    "id": "rest_snap_1",
                    "name": "Snapshot Thai",
                    "slug": "snapshot-thai",
                    "description": "From snapshot",
                    "image": "/images/imported/MissingPlaceId.jpg",
                    "cuisineTags": json.dumps(["Thai"]),
                    "dietaryTags": "[]",
                    "city": "Sydney",
                    "suburb": "Surry Hills",
                    "lat": -33.88,
                    "lng": 151.21,
                    "deliveryFeeCents": 499,
                    "minOrderCents": 1500,
                    "rating": 4.5,
                    "userRatingCount": 10,
                    "isOpen": True,
                    "isActive": True,
                    "createdAt": now,
                    "updatedAt": now,
                }
            ],
            categories=[
                {
                    "id": "cat_snap_1",
                    "restaurantId": "rest_snap_1",
                    "name": "Mains",
                    "sortOrder": 0,
                }
            ],
            menu_items=[
                {
                    "id": "item_snap_1",
                    "categoryId": "cat_snap_1",
                    "name": "Pad Thai",
                    "description": "Classic",
                    "priceCents": 1890,
                    "image": None,
                    "isAvailable": True,
                    "dietaryTags": "[]",
                    "allergens": "[]",
                }
            ],
        ),
    )

    await seed_module.bootstrap_catalog_if_empty(db, snapshot_path=snapshot_path)
    assert await db.restaurants.count_documents({}) == 1
    venue = await db.restaurants.find_one({"id": "rest_snap_1"})
    assert venue is not None
    assert venue["slug"] == "snapshot-thai"
    # Missing imported JPG → cuisine stock fallback
    assert venue["image"] == "/images/restaurants/thai.jpg"
    assert await db.categories.count_documents({}) == 1
    assert await db.menu_items.count_documents({}) == 1

    await seed_module.bootstrap_catalog_if_empty(db, snapshot_path=snapshot_path)
    assert await db.restaurants.count_documents({}) == 1


def test_resolve_restaurant_image_keeps_existing_imported_file(tmp_path):
    place_file = tmp_path / "public" / "images" / "imported" / "ChIJKeep.jpg"
    place_file.parent.mkdir(parents=True, exist_ok=True)
    place_file.write_bytes(b"jpg")
    image = resolve_restaurant_image(
        {
            "image": "/images/imported/ChIJKeep.jpg",
            "cuisineTags": json.dumps(["Burgers"]),
        },
        repo_root=tmp_path,
    )
    assert image == "/images/imported/ChIJKeep.jpg"


@pytest.mark.asyncio
async def test_restore_preserves_ids(tmp_path):
    db = FakeDB()
    payload = build_snapshot_payload(
        restaurants=[
            {
                "id": "rest_a",
                "name": "A",
                "slug": "a",
                "description": "d",
                "image": "/images/restaurants/burger.jpg",
                "cuisineTags": "[]",
                "dietaryTags": "[]",
                "city": "Melbourne",
                "suburb": "Fitzroy",
                "lat": -37.8,
                "lng": 144.9,
                "deliveryFeeCents": 400,
                "minOrderCents": 1200,
                "rating": 4.2,
                "userRatingCount": 3,
                "isOpen": True,
                "isActive": True,
                "createdAt": "2026-01-01T00:00:00+00:00",
                "updatedAt": "2026-01-01T00:00:00+00:00",
            }
        ],
        categories=[],
        menu_items=[],
    )
    counts = await restore_catalog_snapshot(db, payload, repo_root=tmp_path)
    assert counts["restaurants"] == 1
    doc = await db.restaurants.find_one({"id": "rest_a"})
    assert doc is not None
    assert isinstance(doc["createdAt"], datetime)


@pytest.mark.asyncio
async def test_seed_dense_orders_skips_when_reviews_exist(monkeypatch):
    db = FakeDB()
    await seed_module.bootstrap_handwritten_restaurants_if_empty(db)
    customers = await seed_module.ensure_users(db)

    await seed_module.seed_dense_orders(db, customers)
    order_count = await db.orders.count_documents({})
    review_count = await db.reviews.count_documents({})
    assert order_count > 0
    assert review_count > 0

    await seed_module.seed_dense_orders(db, customers)
    assert await db.orders.count_documents({}) == order_count
    assert await db.reviews.count_documents({}) == review_count


@pytest.mark.asyncio
async def test_force_seed_orders_rebuilds(monkeypatch):
    db = FakeDB()
    await seed_module.bootstrap_handwritten_restaurants_if_empty(db)
    customers = await seed_module.ensure_users(db)
    await seed_module.seed_dense_orders(db, customers)
    first_order_ids = {doc["id"] for doc in db.orders.docs}

    monkeypatch.setenv("FORCE_SEED_ORDERS", "1")
    await seed_module.seed_dense_orders(db, customers)
    second_order_ids = {doc["id"] for doc in db.orders.docs}
    assert first_order_ids
    assert second_order_ids
    assert first_order_ids.isdisjoint(second_order_ids)


def test_tag_menu_item_marks_vegan_patty():
    tagged = tag_menu_item(
        name="Veggie Patty",
        description="Plant-based patty, lettuce, tomato, vegan mayo.",
        dietary_tags=["vegan", "vegetarian", "nut-free"],
        category_name="Burgers",
        cuisine_key="Burgers",
    )
    assert "vegan" in tagged["dietaryTags"]
    assert "vegetarian" in tagged["dietaryTags"]
