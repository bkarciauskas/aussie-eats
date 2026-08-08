from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.deps import DbDep
from app.mongo_util import strip_mongo_id
from app.schemas import (
    CategoryOut,
    DietaryCatalogItem,
    DietaryCatalogVenue,
    MenuItemOut,
    RestaurantDetail,
    RestaurantSummary,
    ReviewOut,
)

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


def _restaurant_summary(doc: dict) -> RestaurantSummary:
    return RestaurantSummary.model_validate(doc)


@router.get("", response_model=list[RestaurantSummary])
async def list_restaurants(
    db: DbDep,
    active_only: bool = Query(default=True, alias="activeOnly"),
) -> list[RestaurantSummary]:
    query: dict = {"isActive": True} if active_only else {}
    cursor = db.restaurants.find(query).sort([("rating", -1), ("name", 1)])
    out: list[RestaurantSummary] = []
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            out.append(_restaurant_summary(cleaned))
    return out


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

    restaurant_ids = [r["id"] for r in restaurants]
    category_to_restaurant: dict[str, str] = {}
    async for cat in db.categories.find({"restaurantId": {"$in": restaurant_ids}}):
        cat_doc = strip_mongo_id(cat)
        if cat_doc:
            category_to_restaurant[cat_doc["id"]] = cat_doc["restaurantId"]

    items_by_restaurant: dict[str, list[DietaryCatalogItem]] = {
        r["id"]: [] for r in restaurants
    }
    if category_to_restaurant:
        async for item in db.menu_items.find(
            {"categoryId": {"$in": list(category_to_restaurant.keys())}}
        ):
            item_doc = strip_mongo_id(item)
            if item_doc is None:
                continue
            restaurant_id = category_to_restaurant.get(item_doc["categoryId"])
            if restaurant_id is None:
                continue
            items_by_restaurant[restaurant_id].append(
                DietaryCatalogItem(
                    dietaryTags=item_doc.get("dietaryTags", "[]"),
                    allergens=item_doc.get("allergens", "[]"),
                )
            )

    return [
        DietaryCatalogVenue(
            id=r["id"],
            menuItems=items_by_restaurant.get(r["id"], []),
        )
        for r in restaurants
    ]


@router.get("/{slug}", response_model=RestaurantDetail)
async def get_restaurant(slug: str, db: DbDep) -> RestaurantDetail:
    restaurant = strip_mongo_id(
        await db.restaurants.find_one({"slug": slug, "isActive": True})
    )
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    categories: list[CategoryOut] = []
    cat_cursor = db.categories.find({"restaurantId": restaurant["id"]}).sort(
        [("sortOrder", 1)]
    )
    async for cat in cat_cursor:
        cat_doc = strip_mongo_id(cat)
        if cat_doc is None:
            continue
        items: list[MenuItemOut] = []
        item_cursor = db.menu_items.find({"categoryId": cat_doc["id"]}).sort([("name", 1)])
        async for item in item_cursor:
            item_doc = strip_mongo_id(item)
            if item_doc:
                items.append(MenuItemOut.model_validate(item_doc))
        categories.append(
            CategoryOut(
                id=cat_doc["id"],
                restaurantId=cat_doc["restaurantId"],
                name=cat_doc["name"],
                sortOrder=cat_doc.get("sortOrder", 0),
                items=items,
            )
        )

    reviews: list[ReviewOut] = []
    review_cursor = (
        db.reviews.find({"restaurantId": restaurant["id"]})
        .sort([("createdAt", -1)])
        .limit(8)
    )
    async for review in review_cursor:
        review_doc = strip_mongo_id(review)
        if review_doc is None:
            continue
        user_name: Optional[str] = None
        user = strip_mongo_id(await db.users.find_one({"id": review_doc["userId"]}))
        if user:
            user_name = user.get("name")
        reviews.append(
            ReviewOut.model_validate({**review_doc, "userName": user_name})
        )

    return RestaurantDetail.model_validate(
        {**restaurant, "categories": categories, "reviews": reviews}
    )
