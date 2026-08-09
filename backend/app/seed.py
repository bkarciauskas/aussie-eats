"""Mongo seed: users, catalog snapshot restore, sample orders/reviews.

Usage (from backend/):
  python3 -m app.seed
  FORCE_SEED_ORDERS=1 python3 -m app.seed
  FORCE_RETAG_DIETARY=1 python3 -m app.seed
"""

from __future__ import annotations

import asyncio
import json
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from pymongo.asynchronous.database import AsyncDatabase

from app.catalog_snapshot import SNAPSHOT_PATH, load_snapshot, restore_catalog_snapshot
from app.db import close_db, connect_db, ensure_indexes
from app.domain.cities import DEMO_CITIES
from app.domain.dietary import (
    parse_allergens,
    parse_dietary_tags,
    tags_for_storage,
    union_dietary_tags,
)
from app.domain.reviews import blend_restaurant_rating
from app.domain.search import parse_cuisine_tags
from app.domain.tag_menu_item import tag_menu_categories, tag_menu_item
from app.ids import new_id
from app.models import OrderStatus, Role
from app.security import hash_password

SEED_DATA_PATH = Path(__file__).with_name("seed_data.json")
CATALOG_SNAPSHOT_PATH = SNAPSHOT_PATH

STATUS_STEPS = (
    OrderStatus.pending.value,
    OrderStatus.preparing.value,
    OrderStatus.out_for_delivery.value,
    OrderStatus.delivered.value,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _load_restaurants() -> list[dict[str, Any]]:
    payload = json.loads(SEED_DATA_PATH.read_text(encoding="utf-8"))
    restaurants = payload.get("restaurants")
    if not isinstance(restaurants, list):
        raise ValueError("seed_data.json must contain a restaurants array")
    return restaurants


def history_for(status: str, created_at: datetime) -> list[dict[str, str]]:
    if status == OrderStatus.cancelled.value:
        return [
            {"status": OrderStatus.pending.value, "at": created_at.isoformat()},
            {
                "status": OrderStatus.cancelled.value,
                "at": (created_at + timedelta(minutes=20)).isoformat(),
            },
        ]
    try:
        end = STATUS_STEPS.index(status)
    except ValueError:
        end = 0
    return [
        {
            "status": step,
            "at": (created_at + timedelta(minutes=i * 25)).isoformat(),
        }
        for i, step in enumerate(STATUS_STEPS[: end + 1])
    ]


async def ensure_users(db: AsyncDatabase) -> list[dict[str, Any]]:
    customer_hash = hash_password("demo1234")
    admin_hash = hash_password("admin1234")
    now = _utc_now()

    async def upsert_user(
        *,
        email: str,
        name: str,
        role: Role,
        password_hash: str,
        address: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        existing = await db.users.find_one({"email": email})
        if existing is not None:
            await db.users.update_one(
                {"email": email},
                {"$set": {"name": name, "role": role.value}},
            )
            updated = await db.users.find_one({"email": email})
            assert updated is not None
            return updated

        user_id = new_id()
        doc = {
            "id": user_id,
            "email": email,
            "passwordHash": password_hash,
            "name": name,
            "role": role.value,
            "createdAt": now,
        }
        await db.users.insert_one(doc)
        if address is not None:
            await db.addresses.insert_one(
                {
                    "id": new_id(),
                    "userId": user_id,
                    **address,
                }
            )
        return doc

    customer = await upsert_user(
        email="demo@aussieeats.local",
        name="Demo Customer",
        role=Role.CUSTOMER,
        password_hash=customer_hash,
        address={
            "label": "Home",
            "line1": "100 George Street",
            "suburb": "Sydney",
            "state": "NSW",
            "postcode": "2000",
            "lat": -33.8688,
            "lng": 151.2093,
        },
    )

    await upsert_user(
        email="admin@aussieeats.local",
        name="AussieEats Admin",
        role=Role.ADMIN,
        password_hash=admin_hash,
    )

    extra_customers = [
        {"email": "maya@aussieeats.local", "name": "Maya Chen", "city": DEMO_CITIES[1]},
        {"email": "liam@aussieeats.local", "name": "Liam O'Brien", "city": DEMO_CITIES[2]},
        {"email": "priya@aussieeats.local", "name": "Priya Shah", "city": DEMO_CITIES[3]},
        {"email": "jack@aussieeats.local", "name": "Jack Nguyen", "city": DEMO_CITIES[4]},
        {"email": "ella@aussieeats.local", "name": "Ella Brooks", "city": DEMO_CITIES[5]},
        {"email": "sam@aussieeats.local", "name": "Sam Taylor", "city": DEMO_CITIES[0]},
        {"email": "zoe@aussieeats.local", "name": "Zoe Martin", "city": DEMO_CITIES[1]},
        {"email": "noah@aussieeats.local", "name": "Noah Williams", "city": DEMO_CITIES[2]},
    ]

    customers = [customer]
    for entry in extra_customers:
        city = entry["city"]
        user = await upsert_user(
            email=entry["email"],
            name=entry["name"],
            role=Role.CUSTOMER,
            password_hash=customer_hash,
            address={
                "label": "Home",
                "line1": "12 Demo Street",
                "suburb": city["suburb"],
                "state": city["state"],
                "postcode": city["postcode"],
                "lat": city["lat"],
                "lng": city["lng"],
            },
        )
        customers.append(user)
    return customers


async def bootstrap_handwritten_restaurants_if_empty(db: AsyncDatabase) -> None:
    """Load seed_data.json venues when the catalog is empty and no snapshot applies."""
    count = await db.restaurants.count_documents({})
    if count > 0:
        print(f"  Catalog already has {count} restaurants — skipping handwritten bootstrap")
        return

    print("  Catalog empty — loading handwritten fallback restaurants")
    now = _utc_now()
    for restaurant in _load_restaurants():
        cuisine_tags = restaurant.get("cuisineTags") or []
        cuisine_key = cuisine_tags[0] if cuisine_tags else "Default"
        categories, restaurant_dietary_tags = tag_menu_categories(
            restaurant.get("categories") or [],
            cuisine_key,
        )
        restaurant_id = new_id()
        # Omit placeId so the sparse unique index does not treat null as a value.
        await db.restaurants.insert_one(
            {
                "id": restaurant_id,
                "name": restaurant["name"],
                "slug": restaurant["slug"],
                "description": restaurant["description"],
                "image": restaurant["image"],
                "cuisineTags": cuisine_tags,
                "dietaryTags": restaurant_dietary_tags,
                "city": restaurant["city"],
                "suburb": restaurant["suburb"],
                "lat": restaurant["lat"],
                "lng": restaurant["lng"],
                "deliveryFeeCents": restaurant["deliveryFeeCents"],
                "minOrderCents": restaurant["minOrderCents"],
                "rating": restaurant["rating"],
                "userRatingCount": round(80 + random.random() * 400),
                "phone": restaurant.get("phone"),
                "isOpen": True,
                "isActive": True,
                "createdAt": now,
                "updatedAt": now,
            }
        )
        for idx, cat in enumerate(categories):
            category_id = new_id()
            await db.categories.insert_one(
                {
                    "id": category_id,
                    "restaurantId": restaurant_id,
                    "name": cat["name"],
                    "sortOrder": idx,
                }
            )
            for item in cat["items"]:
                await db.menu_items.insert_one(
                    {
                        "id": new_id(),
                        "categoryId": category_id,
                        "name": item["name"],
                        "description": item["description"],
                        "priceCents": item["priceCents"],
                        "image": item.get("image"),
                        "isAvailable": True,
                        "dietaryTags": item["dietaryTags"],
                        "allergens": item["allergens"],
                    }
                )


async def bootstrap_catalog_if_empty(
    db: AsyncDatabase,
    *,
    snapshot_path: Path = CATALOG_SNAPSHOT_PATH,
) -> None:
    """Prefer committed catalog_snapshot.json; fall back to handwritten seed_data."""
    count = await db.restaurants.count_documents({})
    if count > 0:
        print(f"  Catalog already has {count} restaurants — skipping catalog bootstrap")
        return

    snapshot = load_snapshot(snapshot_path)
    if snapshot is not None:
        counts = await restore_catalog_snapshot(db, snapshot)
        print(
            f"  Catalog empty — restored snapshot "
            f"({counts['restaurants']} restaurants, "
            f"{counts['categories']} categories, "
            f"{counts['menu_items']} menu items)"
        )
        return

    await bootstrap_handwritten_restaurants_if_empty(db)


async def sync_dietary_tags_on_catalog(db: AsyncDatabase) -> None:
    venues = await db.restaurants.find({}).to_list(length=None)
    if not venues:
        return

    # Tagged rows are left alone so admin menu edits survive a reseed; forcing a
    # retag is how corrected tagging rules reach an already-seeded catalog.
    force_retag = os.environ.get("FORCE_RETAG_DIETARY") == "1"
    updated_items = 0
    updated_restaurants = 0

    for venue in venues:
        cuisine_tags = parse_cuisine_tags(venue.get("cuisineTags"))
        cuisine_key = cuisine_tags[0] if cuisine_tags else "Default"
        item_tags: list[dict] = []

        categories = await db.categories.find({"restaurantId": venue["id"]}).to_list(
            length=None
        )
        for cat in categories:
            items = await db.menu_items.find({"categoryId": cat["id"]}).to_list(length=None)
            for item in items:
                existing_diets = parse_dietary_tags(item.get("dietaryTags"))
                existing_allergens = parse_allergens(item.get("allergens"))
                needs_tag = force_retag or (
                    len(existing_diets) == 0 and len(existing_allergens) == 0
                )
                if not needs_tag:
                    item_tags.append({"dietaryTags": item.get("dietaryTags") or []})
                    continue
                # Diets are recomputed, but a recorded allergen is never forgotten —
                # heuristics cannot re-derive it from copy alone.
                tagged = tag_menu_item(
                    name=item["name"],
                    description=item.get("description") or "",
                    category_name=cat.get("name"),
                    cuisine_key=cuisine_key,
                    allergens=existing_allergens,
                )
                if (
                    parse_dietary_tags(item.get("dietaryTags")) != tagged["dietaryTags"]
                    or parse_allergens(item.get("allergens")) != tagged["allergens"]
                ):
                    await db.menu_items.update_one(
                        {"id": item["id"]},
                        {
                            "$set": {
                                "dietaryTags": tagged["dietaryTags"],
                                "allergens": tagged["allergens"],
                            }
                        },
                    )
                    updated_items += 1
                item_tags.append({"dietaryTags": tagged["dietaryTags"]})

        venue_tags = tags_for_storage(union_dietary_tags(item_tags))
        if parse_dietary_tags(venue.get("dietaryTags")) != venue_tags:
            await db.restaurants.update_one(
                {"id": venue["id"]},
                {"$set": {"dietaryTags": venue_tags, "updatedAt": _utc_now()}},
            )
            updated_restaurants += 1

    if updated_items > 0 or updated_restaurants > 0:
        print(
            f"  Dietary tags synced ({updated_items} items, {updated_restaurants} venues)"
        )
    else:
        print("  Dietary tags already present — no sync needed")


async def clear_orders_and_reviews(db: AsyncDatabase) -> None:
    existing_reviews = await db.reviews.find(
        {},
        projection={"restaurantId": 1, "rating": 1},
    ).to_list(length=None)

    # Undo prior seed/live blends so re-running seed does not inflate rating counts.
    by_restaurant: dict[str, list[int]] = {}
    for review in existing_reviews:
        restaurant_id = review["restaurantId"]
        by_restaurant.setdefault(restaurant_id, []).append(int(review["rating"]))

    for restaurant_id, ratings in by_restaurant.items():
        restaurant = await db.restaurants.find_one({"id": restaurant_id})
        if restaurant is None:
            continue

        rating = float(restaurant.get("rating") or 0)
        user_rating_count = int(restaurant.get("userRatingCount") or 0)
        original_rating = rating
        for submitted in ratings:
            if user_rating_count <= 1:
                user_rating_count = 0
                break
            rating = (rating * user_rating_count - submitted) / (user_rating_count - 1)
            user_rating_count -= 1

        await db.restaurants.update_one(
            {"id": restaurant_id},
            {
                "$set": {
                    "rating": original_rating if user_rating_count == 0 else rating,
                    "userRatingCount": user_rating_count,
                    "updatedAt": _utc_now(),
                }
            },
        )

    await db.reviews.delete_many({})
    await db.order_items.delete_many({})
    await db.orders.delete_many({})


async def seed_sample_reviews(
    db: AsyncDatabase,
    delivered_orders: list[dict[str, Any]],
) -> None:
    samples = [
        {"rating": 5, "comment": "Arrived hot and exactly as ordered — will reorder."},
        {"rating": 4, "comment": "Great flavours. Packaging held up well in the rain."},
        {"rating": 5, "comment": "Quick delivery and generous portions."},
        {"rating": 3, "comment": "Tasty but a bit late. Still happy overall."},
        {"rating": 4, "comment": ""},
        {"rating": 5, "comment": "Best dumpling run this week."},
    ]

    # Leave some delivered orders unreviewed so the demo customer can still submit.
    to_review = [o for idx, o in enumerate(delivered_orders) if idx % 3 != 0][: len(samples)]
    created = 0

    for i, order in enumerate(to_review):
        sample = samples[i % len(samples)]
        restaurant = await db.restaurants.find_one({"id": order["restaurantId"]})
        if restaurant is None:
            continue

        rating, user_rating_count = blend_restaurant_rating(
            float(restaurant.get("rating") or 0),
            int(restaurant.get("userRatingCount") or 0),
            sample["rating"],
        )
        created_at = order["createdAt"]
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        await db.reviews.insert_one(
            {
                "id": new_id(),
                "orderId": order["id"],
                "userId": order["userId"],
                "restaurantId": order["restaurantId"],
                "rating": sample["rating"],
                "comment": sample["comment"],
                "createdAt": created_at + timedelta(minutes=90),
            }
        )
        await db.restaurants.update_one(
            {"id": order["restaurantId"]},
            {
                "$set": {
                    "rating": rating,
                    "userRatingCount": user_rating_count,
                    "updatedAt": _utc_now(),
                }
            },
        )
        created += 1

    print(f"  Seeded {created} sample reviews")


async def seed_reviews_onto_existing_orders(db: AsyncDatabase) -> None:
    delivered = await db.orders.find(
        {"status": OrderStatus.delivered.value},
        projection={"id": 1, "userId": 1, "restaurantId": 1, "createdAt": 1},
    ).sort([("createdAt", -1)]).to_list(length=None)

    reviewed_order_ids = {
        doc["orderId"]
        async for doc in db.reviews.find({}, projection={"orderId": 1})
    }
    pending = [o for o in delivered if o["id"] not in reviewed_order_ids]
    await seed_sample_reviews(db, pending)


async def seed_dense_orders(
    db: AsyncDatabase,
    customers: list[dict[str, Any]],
) -> None:
    # Default: keep orders/reviews once seeded (same idea as restaurant bootstrap).
    # Set FORCE_SEED_ORDERS=1 to wipe and rebuild sample orders + reviews.
    force_refresh = os.environ.get("FORCE_SEED_ORDERS") == "1"
    existing_review_count = await db.reviews.count_documents({})
    existing_order_count = await db.orders.count_documents({})

    if not force_refresh and existing_review_count > 0:
        print(
            f"  Orders/reviews already in DB ({existing_order_count} orders, "
            f"{existing_review_count} reviews) — skipping refresh"
        )
        return

    if not force_refresh and existing_order_count > 0:
        print(
            f"  Orders already present ({existing_order_count}) — "
            "seeding reviews onto delivered orders only"
        )
        await seed_reviews_onto_existing_orders(db)
        return

    if force_refresh:
        print("  FORCE_SEED_ORDERS=1 — clearing and rebuilding sample orders/reviews")
        await clear_orders_and_reviews(db)

    catalog = await db.restaurants.find({"isActive": True}).limit(80).to_list(length=80)
    if not catalog:
        return

    # Attach categories/items for each restaurant.
    enriched: list[dict[str, Any]] = []
    for restaurant in catalog:
        categories = await db.categories.find(
            {"restaurantId": restaurant["id"]}
        ).sort([("sortOrder", 1)]).to_list(length=None)
        for cat in categories:
            cat["items"] = await db.menu_items.find(
                {"categoryId": cat["id"]}
            ).to_list(length=None)
        restaurant["categories"] = categories
        enriched.append(restaurant)

    statuses = (
        OrderStatus.delivered.value,
        OrderStatus.delivered.value,
        OrderStatus.delivered.value,
        OrderStatus.preparing.value,
        OrderStatus.out_for_delivery.value,
        OrderStatus.pending.value,
        OrderStatus.cancelled.value,
    )

    demo = next(c for c in customers if c["email"] == "demo@aussieeats.local")
    created = 0
    delivered_orders: list[dict[str, Any]] = []
    now = _utc_now()

    for i in range(55):
        restaurant = enriched[i % len(enriched)]
        items = [
            item
            for cat in restaurant["categories"]
            for item in cat.get("items", [])
            if item.get("isAvailable", True)
        ]
        if not items:
            continue

        pick = items[: 1 + (i % 3)]
        subtotal_cents = sum(
            item["priceCents"] * (1 + (idx % 2)) for idx, item in enumerate(pick)
        )
        status = statuses[i % len(statuses)]
        created_at = now - timedelta(hours=(i + 1) * 3)
        user = demo if i % 4 == 0 else customers[i % len(customers)]
        city_meta = next(
            (c for c in DEMO_CITIES if c["label"] == restaurant["city"]),
            DEMO_CITIES[0],
        )

        order_id = new_id()
        order_doc = {
            "id": order_id,
            "userId": user["id"],
            "restaurantId": restaurant["id"],
            "status": status,
            "statusHistoryJson": json.dumps(history_for(status, created_at)),
            "subtotalCents": subtotal_cents,
            "deliveryFeeCents": restaurant["deliveryFeeCents"],
            "totalCents": subtotal_cents + restaurant["deliveryFeeCents"],
            "deliveryAddress": json.dumps(
                {
                    "label": "Home",
                    "line1": "12 Demo Street",
                    "suburb": city_meta["suburb"],
                    "state": city_meta["state"],
                    "postcode": city_meta["postcode"],
                }
            ),
            "paymentMethod": "Pay on delivery",
            "createdAt": created_at,
            "updatedAt": created_at,
        }
        await db.orders.insert_one(order_doc)
        for idx, item in enumerate(pick):
            await db.order_items.insert_one(
                {
                    "id": new_id(),
                    "orderId": order_id,
                    "menuItemId": item["id"],
                    "name": item["name"],
                    "unitPriceCents": item["priceCents"],
                    "quantity": 1 + (idx % 2),
                }
            )
        created += 1
        if status == OrderStatus.delivered.value:
            delivered_orders.append(order_doc)

    print(f"  Seeded {created} sample orders")
    await seed_sample_reviews(db, delivered_orders)


async def run_seed() -> None:
    print("Seed (non-destructive to restaurant catalog):")
    db = await connect_db()
    try:
        await ensure_indexes()

        customers = await ensure_users(db)
        print(f"  Users upserted ({len(customers)} customers + admin)")
        await bootstrap_catalog_if_empty(db)
        await sync_dietary_tags_on_catalog(db)
        await seed_dense_orders(db, customers)

        restaurant_count = await db.restaurants.count_documents({})
        order_count = await db.orders.count_documents({})
        review_count = await db.reviews.count_documents({})
        user_count = await db.users.count_documents({})

        by_city_pipeline = [
            {"$group": {"_id": "$city", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]
        by_city_cursor = await db.restaurants.aggregate(by_city_pipeline)
        by_city = await by_city_cursor.to_list(length=None)

        print("Seed complete:")
        print("  Customer: demo@aussieeats.local / demo1234")
        print("  Admin:    admin@aussieeats.local / admin1234")
        print(f"  Users: {user_count}")
        print(f"  Restaurants: {restaurant_count}")
        print(f"  Orders: {order_count}")
        print(f"  Reviews: {review_count}")
        print(
            "  Cities:",
            ", ".join(f"{row['_id']} ({row['count']})" for row in by_city),
        )
        print(
            "  Tip: FORCE_SEED_ORDERS=1 python3 -m app.seed to rebuild sample orders/reviews."
        )
        print("  Tip: FORCE_RETAG_DIETARY=1 python3 -m app.seed to recompute dietary tags.")
    finally:
        await close_db()


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()