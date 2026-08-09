from __future__ import annotations

import re
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.deps import DbDep
from app.domain.cities import find_demo_city
from app.domain.dietary import (
    DIET_IDS,
    restaurant_matches_diets,
)
from app.domain.search import parse_cuisine_tags, restaurant_matches_query
from app.mongo_util import normalize_tags_for_api, strip_mongo_id
from app.schemas import (
    CategoryOut,
    DietaryCatalogItem,
    DietaryCatalogVenue,
    MenuItemOut,
    RestaurantDetail,
    RestaurantListResponse,
    RestaurantSummary,
    ReviewOut,
)

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


def _restaurant_summary(doc: dict) -> RestaurantSummary:
    return RestaurantSummary.model_validate(normalize_tags_for_api(doc))


def _parse_diet_param(raw: str) -> list[str]:
    if not raw.strip():
        return []
    selected: set[str] = set()
    for part in raw.replace("+", ",").split(","):
        token = part.strip().lower()
        if token == "gf":
            token = "gluten-free"
        if token in DIET_IDS:
            selected.add(token)
    return [diet for diet in DIET_IDS if diet in selected]


async def _menu_items_by_restaurant(
    db,
    restaurant_ids: list[str],
) -> dict[str, list[dict]]:
    if not restaurant_ids:
        return {}
    category_to_restaurant: dict[str, str] = {}
    async for cat in db.categories.find({"restaurantId": {"$in": restaurant_ids}}):
        cat_doc = strip_mongo_id(cat)
        if cat_doc:
            category_to_restaurant[cat_doc["id"]] = cat_doc["restaurantId"]

    items_by_restaurant: dict[str, list[dict]] = {rid: [] for rid in restaurant_ids}
    if not category_to_restaurant:
        return items_by_restaurant

    async for item in db.menu_items.find(
        {"categoryId": {"$in": list(category_to_restaurant.keys())}}
    ):
        item_doc = strip_mongo_id(item)
        if item_doc is None:
            continue
        restaurant_id = category_to_restaurant.get(item_doc["categoryId"])
        if restaurant_id is None:
            continue
        items_by_restaurant[restaurant_id].append(item_doc)
    return items_by_restaurant


@router.get("", response_model=RestaurantListResponse)
async def list_restaurants(
    db: DbDep,
    active_only: bool = Query(default=True, alias="activeOnly"),
    city: str = Query(default=""),
    cuisine: str = Query(default=""),
    q: str = Query(default=""),
    diet: str = Query(default=""),
) -> RestaurantListResponse:
    query: dict = {"isActive": True} if active_only else {}
    wanted_city = find_demo_city(city)
    if wanted_city is not None:
        # Case-insensitive: admin/legacy rows may store non-canonical casing.
        query["city"] = {
            "$regex": f"^{re.escape(wanted_city['label'])}$",
            "$options": "i",
        }

    scoped: list[dict] = []
    cursor = db.restaurants.find(query).sort([("rating", -1), ("name", 1)])
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            scoped.append(cleaned)

    available_cuisines = sorted(
        {
            tag
            for restaurant in scoped
            for tag in parse_cuisine_tags(restaurant.get("cuisineTags"))
        }
    )

    cuisine_key = cuisine.strip().lower()
    filtered = scoped
    if cuisine_key:
        filtered = [
            restaurant
            for restaurant in filtered
            if any(
                tag.lower() == cuisine_key
                for tag in parse_cuisine_tags(restaurant.get("cuisineTags"))
            )
        ]
    if q.strip():
        filtered = [
            restaurant for restaurant in filtered if restaurant_matches_query(restaurant, q)
        ]

    diets = _parse_diet_param(diet)
    if diets:
        items_by_restaurant = await _menu_items_by_restaurant(
            db, [restaurant["id"] for restaurant in filtered]
        )
        filtered = [
            restaurant
            for restaurant in filtered
            if restaurant_matches_diets(items_by_restaurant.get(restaurant["id"], []), diets)
        ]

    return RestaurantListResponse(
        restaurants=[_restaurant_summary(restaurant) for restaurant in filtered],
        availableCuisines=available_cuisines,
    )


@router.get("/dietary-catalog", response_model=list[DietaryCatalogVenue])
async def dietary_catalog(
    db: DbDep,
    active_only: bool = Query(default=True, alias="activeOnly"),
) -> list[DietaryCatalogVenue]:
    """One-shot menu diet tags for browse filters (no reviews / full menus)."""
    query: dict = {"isActive": True} if active_only else {}
    restaurants: list[dict] = []
    async for doc in db.restaurants.find(query):
        cleaned = strip_mongo_id(doc)
        if cleaned:
            restaurants.append(cleaned)

    if not restaurants:
        return []

    items_by_restaurant = await _menu_items_by_restaurant(
        db, [r["id"] for r in restaurants]
    )

    venues: list[DietaryCatalogVenue] = []
    for restaurant in restaurants:
        lean_items: list[DietaryCatalogItem] = []
        for item_doc in items_by_restaurant.get(restaurant["id"], []):
            normalized = normalize_tags_for_api(item_doc)
            lean_items.append(
                DietaryCatalogItem(
                    dietaryTags=normalized.get("dietaryTags", "[]"),
                    allergens=normalized.get("allergens", "[]"),
                )
            )
        venues.append(
            DietaryCatalogVenue(
                id=restaurant["id"],
                menuItems=lean_items,
            )
        )
    return venues


@router.get("/{slug}", response_model=RestaurantDetail)
async def get_restaurant(slug: str, db: DbDep) -> RestaurantDetail:
    restaurant = strip_mongo_id(
        await db.restaurants.find_one({"slug": slug, "isActive": True})
    )
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    category_docs: list[dict] = []
    cat_cursor = db.categories.find({"restaurantId": restaurant["id"]}).sort(
        [("sortOrder", 1)]
    )
    async for cat in cat_cursor:
        cat_doc = strip_mongo_id(cat)
        if cat_doc:
            category_docs.append(cat_doc)

    items_by_category: dict[str, list[MenuItemOut]] = defaultdict(list)
    category_ids = [cat["id"] for cat in category_docs]
    if category_ids:
        item_cursor = db.menu_items.find({"categoryId": {"$in": category_ids}}).sort(
            [("name", 1)]
        )
        async for item in item_cursor:
            item_doc = strip_mongo_id(item)
            if item_doc:
                items_by_category[item_doc["categoryId"]].append(
                    MenuItemOut.model_validate(normalize_tags_for_api(item_doc))
                )

    categories: list[CategoryOut] = [
        CategoryOut(
            id=cat_doc["id"],
            restaurantId=cat_doc["restaurantId"],
            name=cat_doc["name"],
            sortOrder=cat_doc.get("sortOrder", 0),
            items=items_by_category.get(cat_doc["id"], []),
        )
        for cat_doc in category_docs
    ]

    review_docs: list[dict] = []
    review_cursor = (
        db.reviews.find({"restaurantId": restaurant["id"]})
        .sort([("createdAt", -1)])
        .limit(8)
    )
    async for review in review_cursor:
        review_doc = strip_mongo_id(review)
        if review_doc:
            review_docs.append(review_doc)

    users_by_id: dict[str, dict] = {}
    user_ids = list({review["userId"] for review in review_docs})
    if user_ids:
        async for user in db.users.find({"id": {"$in": user_ids}}):
            user_doc = strip_mongo_id(user)
            if user_doc:
                users_by_id[user_doc["id"]] = user_doc

    reviews: list[ReviewOut] = []
    for review_doc in review_docs:
        user = users_by_id.get(review_doc["userId"])
        user_name: Optional[str] = user.get("name") if user else None
        reviews.append(
            ReviewOut.model_validate({**review_doc, "userName": user_name})
        )

    return RestaurantDetail.model_validate(
        {
            **normalize_tags_for_api(restaurant),
            "categories": categories,
            "reviews": reviews,
        }
    )
