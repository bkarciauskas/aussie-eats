from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from app.deps import AdminUser, DbDep
from app.domain.dietary import (
    filter_known_allergens,
    filter_known_diets,
    tags_for_storage,
    union_dietary_tags,
)
from app.ids import new_id
from app.models import Role
from app.mongo_util import normalize_tags_for_api, strip_mongo_id
from app.routers.orders import _orders_out_many
from app.schemas import (
    AdminDashboardResponse,
    CategoryOut,
    CategoryUpsertRequest,
    MenuItemOut,
    MenuItemUpsertRequest,
    OkResponse,
    OrderOut,
    RestaurantSummary,
    RestaurantUpsertRequest,
    ToggleActiveRequest,
    ToggleAvailabilityRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:60] or "restaurant"


async def _sync_restaurant_dietary_tags(db, restaurant_id: str) -> None:
    category_ids: list[str] = []
    async for cat in db.categories.find({"restaurantId": restaurant_id}):
        cleaned = strip_mongo_id(cat)
        if cleaned:
            category_ids.append(cleaned["id"])

    items: list[dict] = []
    if category_ids:
        async for item in db.menu_items.find({"categoryId": {"$in": category_ids}}):
            cleaned = strip_mongo_id(item)
            if cleaned:
                items.append(cleaned)

    await db.restaurants.update_one(
        {"id": restaurant_id},
        {
            "$set": {
                "dietaryTags": tags_for_storage(union_dietary_tags(items)),
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def dashboard(_admin: AdminUser, db: DbDep) -> AdminDashboardResponse:
    restaurant_count = await db.restaurants.count_documents({"isActive": True})
    open_orders = await db.orders.count_documents(
        {"status": {"$in": ["pending", "preparing", "out_for_delivery"]}}
    )
    customer_count = await db.users.count_documents({"role": Role.CUSTOMER.value})

    recent_docs: list[dict] = []
    cursor = db.orders.find({}).sort([("createdAt", -1)]).limit(5)
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            recent_docs.append(cleaned)
    recent = await _orders_out_many(
        db,
        recent_docs,
        include_restaurant=True,
        include_review=False,
        include_user=True,
    )

    return AdminDashboardResponse(
        restaurantCount=restaurant_count,
        openOrders=open_orders,
        customerCount=customer_count,
        recentOrders=recent,
    )


@router.get("/restaurants", response_model=list[RestaurantSummary])
async def list_restaurants(_admin: AdminUser, db: DbDep) -> list[RestaurantSummary]:
    out: list[RestaurantSummary] = []
    cursor = db.restaurants.find({}).sort([("name", 1)])
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            out.append(RestaurantSummary.model_validate(normalize_tags_for_api(cleaned)))
    return out


@router.get("/restaurants/{restaurant_id}", response_model=RestaurantSummary)
async def get_restaurant(
    restaurant_id: str,
    _admin: AdminUser,
    db: DbDep,
) -> RestaurantSummary:
    restaurant = strip_mongo_id(await db.restaurants.find_one({"id": restaurant_id}))
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
    return RestaurantSummary.model_validate(normalize_tags_for_api(restaurant))


@router.get("/restaurants/{restaurant_id}/menu", response_model=list[CategoryOut])
async def get_restaurant_menu(
    restaurant_id: str,
    _admin: AdminUser,
    db: DbDep,
) -> list[CategoryOut]:
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    categories: list[CategoryOut] = []
    cat_cursor = db.categories.find({"restaurantId": restaurant_id}).sort(
        [("sortOrder", 1)]
    )
    async for cat in cat_cursor:
        cat_doc = strip_mongo_id(cat)
        if cat_doc is None:
            continue
        items: list[MenuItemOut] = []
        item_cursor = db.menu_items.find({"categoryId": cat_doc["id"]}).sort(
            [("name", 1)]
        )
        async for item in item_cursor:
            item_doc = strip_mongo_id(item)
            if item_doc:
                items.append(MenuItemOut.model_validate(normalize_tags_for_api(item_doc)))
        categories.append(
            CategoryOut(
                id=cat_doc["id"],
                restaurantId=cat_doc["restaurantId"],
                name=cat_doc["name"],
                sortOrder=cat_doc.get("sortOrder", 0),
                items=items,
            )
        )
    return categories


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(_admin: AdminUser, db: DbDep) -> list[OrderOut]:
    orders: list[dict] = []
    cursor = db.orders.find({}).sort([("createdAt", -1)])
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            orders.append(cleaned)
    return await _orders_out_many(
        db,
        orders,
        include_restaurant=True,
        include_review=False,
        include_user=True,
    )


@router.post(
    "/restaurants",
    response_model=RestaurantSummary,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_restaurant(
    body: RestaurantUpsertRequest,
    _admin: AdminUser,
    db: DbDep,
) -> RestaurantSummary:
    name = body.name.strip()
    description = body.description.strip()
    city = body.city.strip() or "Sydney"
    suburb = body.suburb.strip()
    if not name or not description or not suburb or not city:
        raise HTTPException(
            status_code=400,
            detail="Name, description, city, and suburb are required.",
        )
    if (
        body.delivery_fee_cents < 0
        or body.min_order_cents < 0
        or body.rating < 0
        or body.rating > 5
    ):
        raise HTTPException(
            status_code=400,
            detail="Delivery fee, minimum order, and rating must be valid non-negative numbers.",
        )
    if not (-90 <= body.lat <= 90 and -180 <= body.lng <= 180):
        raise HTTPException(
            status_code=400,
            detail="Latitude and longitude must be valid coordinates.",
        )

    cuisine_tags = tags_for_storage([t.strip() for t in body.cuisine_tags if t.strip()])
    now = datetime.now(timezone.utc)

    if body.id:
        existing = await db.restaurants.find_one({"id": body.id})
        if existing is None:
            raise HTTPException(status_code=404, detail="Restaurant not found.")
        await db.restaurants.update_one(
            {"id": body.id},
            {
                "$set": {
                    "name": name,
                    "description": description,
                    "city": city,
                    "suburb": suburb,
                    "cuisineTags": cuisine_tags,
                    "image": body.image,
                    "deliveryFeeCents": body.delivery_fee_cents,
                    "minOrderCents": body.min_order_cents,
                    "rating": body.rating,
                    "phone": body.phone or None,
                    "isOpen": body.is_open,
                    "isActive": body.is_active,
                    "lat": body.lat,
                    "lng": body.lng,
                    "updatedAt": now,
                }
            },
        )
        updated = strip_mongo_id(await db.restaurants.find_one({"id": body.id}))
        assert updated is not None
        return RestaurantSummary.model_validate(normalize_tags_for_api(updated))

    slug = _slugify(name)
    if await db.restaurants.find_one({"slug": slug}):
        slug = f"{slug}-{new_id()[:8]}"

    doc = {
        "id": new_id(),
        "name": name,
        "slug": slug,
        "description": description,
        "image": body.image,
        "cuisineTags": cuisine_tags,
        "dietaryTags": [],
        "city": city,
        "suburb": suburb,
        "lat": body.lat,
        "lng": body.lng,
        "deliveryFeeCents": body.delivery_fee_cents,
        "minOrderCents": body.min_order_cents,
        "isOpen": body.is_open,
        "isActive": body.is_active,
        "rating": body.rating,
        "placeId": None,
        "userRatingCount": 0,
        "openingHoursJson": None,
        "phone": body.phone or None,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.restaurants.insert_one(doc)
    return RestaurantSummary.model_validate(normalize_tags_for_api(doc))


@router.patch("/restaurants/{restaurant_id}/active", response_model=OkResponse)
async def toggle_restaurant_active(
    restaurant_id: str,
    body: ToggleActiveRequest,
    _admin: AdminUser,
    db: DbDep,
) -> OkResponse:
    result = await db.restaurants.update_one(
        {"id": restaurant_id},
        {
            "$set": {
                "isActive": body.is_active,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found.")
    return OkResponse(ok=True)


@router.post("/categories", response_model=CategoryOut)
async def upsert_category(
    body: CategoryUpsertRequest,
    _admin: AdminUser,
    db: DbDep,
) -> CategoryOut:
    name = body.name.strip()
    if not body.restaurant_id or not name:
        raise HTTPException(status_code=400, detail="Category name is required.")

    restaurant = await db.restaurants.find_one({"id": body.restaurant_id})
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    if body.id:
        existing = await db.categories.find_one({"id": body.id})
        if existing is None:
            raise HTTPException(status_code=404, detail="Category not found.")
        await db.categories.update_one(
            {"id": body.id},
            {"$set": {"name": name, "sortOrder": body.sort_order}},
        )
        updated = strip_mongo_id(await db.categories.find_one({"id": body.id}))
        assert updated is not None
        return CategoryOut(
            id=updated["id"],
            restaurantId=updated["restaurantId"],
            name=updated["name"],
            sortOrder=updated.get("sortOrder", 0),
            items=[],
        )

    doc = {
        "id": new_id(),
        "restaurantId": body.restaurant_id,
        "name": name,
        "sortOrder": body.sort_order,
    }
    await db.categories.insert_one(doc)
    return CategoryOut(
        id=doc["id"],
        restaurantId=doc["restaurantId"],
        name=doc["name"],
        sortOrder=doc["sortOrder"],
        items=[],
    )


@router.post("/menu-items", response_model=MenuItemOut)
async def upsert_menu_item(
    body: MenuItemUpsertRequest,
    _admin: AdminUser,
    db: DbDep,
) -> MenuItemOut:
    name = body.name.strip()
    if not body.category_id or not name or body.price_cents < 0:
        raise HTTPException(
            status_code=400,
            detail="Name, category, and a non-negative price are required.",
        )

    category = strip_mongo_id(await db.categories.find_one({"id": body.category_id}))
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")

    dietary_tags = tags_for_storage(filter_known_diets(body.dietary_tags))
    allergens = tags_for_storage(filter_known_allergens(body.allergens))
    image: Optional[str] = body.image or None

    if body.id:
        existing = await db.menu_items.find_one({"id": body.id})
        if existing is None:
            raise HTTPException(status_code=404, detail="Menu item not found.")
        await db.menu_items.update_one(
            {"id": body.id},
            {
                "$set": {
                    "name": name,
                    "description": body.description.strip(),
                    "priceCents": body.price_cents,
                    "image": image,
                    "isAvailable": body.is_available,
                    "categoryId": body.category_id,
                    "dietaryTags": dietary_tags,
                    "allergens": allergens,
                }
            },
        )
        updated = strip_mongo_id(await db.menu_items.find_one({"id": body.id}))
        assert updated is not None
        item_out = MenuItemOut.model_validate(normalize_tags_for_api(updated))
    else:
        doc = {
            "id": new_id(),
            "categoryId": body.category_id,
            "name": name,
            "description": body.description.strip(),
            "priceCents": body.price_cents,
            "image": image,
            "isAvailable": body.is_available,
            "dietaryTags": dietary_tags,
            "allergens": allergens,
        }
        await db.menu_items.insert_one(doc)
        item_out = MenuItemOut.model_validate(normalize_tags_for_api(doc))

    restaurant_id = body.restaurant_id or category["restaurantId"]
    await _sync_restaurant_dietary_tags(db, restaurant_id)
    return item_out


@router.patch("/menu-items/{item_id}/availability", response_model=OkResponse)
async def toggle_menu_item_availability(
    item_id: str,
    body: ToggleAvailabilityRequest,
    _admin: AdminUser,
    db: DbDep,
) -> OkResponse:
    result = await db.menu_items.update_one(
        {"id": item_id},
        {"$set": {"isAvailable": body.is_available}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    return OkResponse(ok=True)
