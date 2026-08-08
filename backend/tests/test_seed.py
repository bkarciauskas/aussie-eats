import pytest

from app import seed as seed_module
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
async def test_bootstrap_loads_handwritten_when_empty_and_is_nondestructive(monkeypatch):
    db = FakeDB()

    await seed_module.bootstrap_handwritten_restaurants_if_empty(db)
    first_count = await db.restaurants.count_documents({})
    assert first_count > 0
    assert await db.categories.count_documents({}) > 0
    assert await db.menu_items.count_documents({}) > 0

    harbour = await db.restaurants.find_one({"slug": "harbour-burger-co"})
    assert harbour is not None
    original_id = harbour["id"]

    await seed_module.bootstrap_handwritten_restaurants_if_empty(db)
    assert await db.restaurants.count_documents({}) == first_count
    harbour_again = await db.restaurants.find_one({"slug": "harbour-burger-co"})
    assert harbour_again is not None
    assert harbour_again["id"] == original_id


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
