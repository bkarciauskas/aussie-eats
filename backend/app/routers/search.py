from __future__ import annotations

from fastapi import APIRouter, Query

from app.deps import DbDep
from app.domain.cities import DEMO_CITIES
from app.domain.search import build_search_suggestions, parse_cuisine_tags
from app.mongo_util import strip_mongo_id
from app.schemas import SearchSuggestResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/suggest", response_model=SearchSuggestResponse)
async def suggest(
    db: DbDep,
    q: str = Query(default=""),
) -> SearchSuggestResponse:
    query = q.strip()
    if not query:
        return SearchSuggestResponse(suggestions=[])

    restaurants: list[dict] = []
    cursor = db.restaurants.find({"isActive": True}).sort(
        [("rating", -1), ("name", 1)]
    )
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            restaurants.append(cleaned)

    cuisines = sorted(
        {
            tag
            for restaurant in restaurants
            for tag in parse_cuisine_tags(restaurant.get("cuisineTags"))
        }
    )
    suburbs = sorted(
        {
            suburb
            for restaurant in restaurants
            if (suburb := restaurant.get("suburb"))
        }
    )

    suggestions = build_search_suggestions(
        query=query,
        restaurants=restaurants,
        cuisines=cuisines,
        suburbs=suburbs,
        cities=DEMO_CITIES,
        limit=8,
    )
    return SearchSuggestResponse(suggestions=suggestions)
