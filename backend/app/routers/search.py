from __future__ import annotations

import time
from typing import Optional

from fastapi import APIRouter, Query
from pymongo.errors import PyMongoError

from app.db import SEARCH_INDEX_NAME
from app.deps import DbDep
from app.domain.cities import DEMO_CITIES
from app.domain.search import build_search_suggestions, parse_cuisine_tags
from app.mongo_util import strip_mongo_id
from app.schemas import SearchSuggestResponse

router = APIRouter(prefix="/search", tags=["search"])

# How many restaurants the Atlas Search stage returns before ranking/merging.
# The typeahead only needs a handful of suggestions, so a bounded candidate set
# keeps the query cheap regardless of catalog size.
_CANDIDATE_LIMIT = 25

# Cache whether Atlas Search is usable so we don't probe list_search_indexes on
# every keystroke. True is sticky; False is re-checked periodically because the
# index may still be building right after startup.
_atlas_ready: Optional[bool] = None
_atlas_checked_at: float = 0.0
_ATLAS_RECHECK_SECONDS = 15.0


async def _atlas_search_ready(db) -> bool:
    global _atlas_ready, _atlas_checked_at
    if _atlas_ready:
        return True
    if _atlas_ready is False and (time.monotonic() - _atlas_checked_at) < _ATLAS_RECHECK_SECONDS:
        return False

    _atlas_checked_at = time.monotonic()
    lister = getattr(db.restaurants, "list_search_indexes", None)
    if lister is None:
        _atlas_ready = False
        return False
    try:
        async for index in await lister():
            if index.get("name") != SEARCH_INDEX_NAME:
                continue
            # `queryable` flips true once the index build finishes.
            if index.get("queryable") or index.get("status") == "READY":
                _atlas_ready = True
                return True
        _atlas_ready = False
        return False
    except PyMongoError:
        _atlas_ready = False
        return False


async def _atlas_candidates(db, query: str) -> list[dict]:
    """Restaurant candidates from Atlas Search, matching name, suburb, or cuisine."""
    pipeline = [
        {
            "$search": {
                "index": SEARCH_INDEX_NAME,
                "compound": {
                    "should": [
                        {
                            "autocomplete": {
                                "query": query,
                                "path": "name",
                                "score": {"boost": {"value": 3}},
                            }
                        },
                        {"autocomplete": {"query": query, "path": "suburb"}},
                        {"text": {"query": query, "path": "cuisineTags"}},
                    ],
                    "minimumShouldMatch": 1,
                    "filter": [{"equals": {"path": "isActive", "value": True}}],
                },
            }
        },
        {"$limit": _CANDIDATE_LIMIT},
        {
            "$project": {
                "_id": 0,
                "name": 1,
                "slug": 1,
                "suburb": 1,
                "city": 1,
                "cuisineTags": 1,
            }
        },
    ]
    candidates: list[dict] = []
    async for doc in db.restaurants.aggregate(pipeline):
        cleaned = strip_mongo_id(doc)
        if cleaned:
            candidates.append(cleaned)
    return candidates


async def _scan_candidates(db) -> list[dict]:
    """Fallback: load active restaurants and rank in-process (small catalogs)."""
    candidates: list[dict] = []
    cursor = db.restaurants.find({"isActive": True}).sort([("rating", -1), ("name", 1)])
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            candidates.append(cleaned)
    return candidates


@router.get("/suggest", response_model=SearchSuggestResponse)
async def suggest(
    db: DbDep,
    q: str = Query(default=""),
) -> SearchSuggestResponse:
    query = q.strip()
    if not query:
        return SearchSuggestResponse(suggestions=[])

    restaurants: list[dict] = []
    if await _atlas_search_ready(db):
        try:
            restaurants = await _atlas_candidates(db, query)
        except PyMongoError:
            # Index dropped or a transient failure: fall back for this request.
            restaurants = await _scan_candidates(db)
    else:
        restaurants = await _scan_candidates(db)

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
