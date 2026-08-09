from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.deps import CurrentUser, DbDep
from app.ids import new_id
from app.mongo_util import normalize_tags_for_api, strip_mongo_id
from app.schemas import FavouriteIdsResponse, RestaurantSummary, ToggleFavouriteResponse

router = APIRouter(prefix="/favourites", tags=["favourites"])


@router.get("", response_model=FavouriteIdsResponse)
async def list_favourite_ids(user: CurrentUser, db: DbDep) -> FavouriteIdsResponse:
    ids: list[str] = []
    cursor = db.favourites.find({"userId": user.id})
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            ids.append(cleaned["restaurantId"])
    return FavouriteIdsResponse(restaurantIds=ids)


@router.get("/restaurants", response_model=list[RestaurantSummary])
async def list_favourite_restaurants(
    user: CurrentUser,
    db: DbDep,
) -> list[RestaurantSummary]:
    fav_ids: list[str] = []
    cursor = db.favourites.find({"userId": user.id}).sort([("createdAt", -1)])
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            fav_ids.append(cleaned["restaurantId"])

    if not fav_ids:
        return []

    by_id: dict[str, RestaurantSummary] = {}
    rest_cursor = db.restaurants.find({"id": {"$in": fav_ids}, "isActive": True})
    async for doc in rest_cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            by_id[cleaned["id"]] = RestaurantSummary.model_validate(
                normalize_tags_for_api(cleaned)
            )

    return [by_id[rid] for rid in fav_ids if rid in by_id]


@router.post("/{restaurant_id}/toggle", response_model=ToggleFavouriteResponse)
async def toggle_favourite(
    restaurant_id: str,
    user: CurrentUser,
    db: DbDep,
) -> ToggleFavouriteResponse:
    normalized = restaurant_id.strip()
    if not normalized:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    restaurant = strip_mongo_id(
        await db.restaurants.find_one({"id": normalized, "isActive": True})
    )
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    existing = strip_mongo_id(
        await db.favourites.find_one(
            {"userId": user.id, "restaurantId": restaurant["id"]}
        )
    )
    if existing:
        await db.favourites.delete_one({"id": existing["id"]})
        return ToggleFavouriteResponse(ok=True, isFavourite=False)

    await db.favourites.insert_one(
        {
            "id": new_id(),
            "userId": user.id,
            "restaurantId": restaurant["id"],
            "createdAt": datetime.now(timezone.utc),
        }
    )
    return ToggleFavouriteResponse(ok=True, isFavourite=True)
