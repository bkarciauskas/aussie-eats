"""Search suggestion ranking (ported from src/lib/search-suggestions.ts)."""

from __future__ import annotations

import math
from typing import Any, Callable, Optional, Sequence, TypeVar, Union

from app.domain.cities import DEMO_CITIES, DemoCity
from app.domain.dietary import coerce_tag_list

T = TypeVar("T")

TagRaw = Union[str, list, None]


def parse_cuisine_tags(raw: TagRaw) -> list[str]:
    if isinstance(raw, list):
        return [str(tag) for tag in raw if isinstance(tag, str) and tag.strip()]
    if not raw:
        return []
    coerced = coerce_tag_list(raw)
    if coerced:
        return coerced
    if isinstance(raw, str):
        return [part.strip() for part in raw.split(",") if part.strip()]
    return []


def restaurant_matches_query(restaurant: dict[str, Any], q: str) -> bool:
    """True when every query token appears in name, suburb, city, or cuisine tags."""
    query = q.strip().lower()
    if not query:
        return True

    haystack = " ".join(
        [
            str(restaurant.get("name") or ""),
            str(restaurant.get("suburb") or ""),
            str(restaurant.get("city") or ""),
            *parse_cuisine_tags(restaurant.get("cuisineTags")),
        ]
    ).lower()

    if query in haystack:
        return True

    tokens = [token for token in query.split() if token]
    return bool(tokens) and all(token in haystack for token in tokens)


def _match_rank(label: str, query: str) -> float:
    normalized = label.lower()
    if normalized == query:
        return 0
    if normalized.startswith(query):
        return 1
    if query in normalized:
        return 2
    return math.inf


def _ranked(items: Sequence[T], query: str, label_for: Callable[[T], str]) -> list[T]:
    scored = []
    for index, item in enumerate(items):
        rank = _match_rank(label_for(item), query)
        if math.isfinite(rank):
            scored.append((rank, index, item))
    scored.sort(key=lambda row: (row[0], row[1]))
    return [item for _rank, _index, item in scored]


def build_search_suggestions(
    *,
    query: str,
    restaurants: Sequence[dict[str, Any]],
    cuisines: Sequence[str],
    suburbs: Sequence[str],
    cities: Sequence[DemoCity] | None = None,
    limit: int = 8,
) -> list[dict[str, Any]]:
    normalized = query.strip().lower()
    if not normalized or limit <= 0:
        return []

    city_list = list(cities) if cities is not None else DEMO_CITIES
    suggestions: list[dict[str, Any]] = []

    for restaurant in _ranked(restaurants, normalized, lambda r: str(r["name"])):
        suggestions.append(
            {
                "kind": "restaurant",
                "label": restaurant["name"],
                "slug": restaurant["slug"],
                "detail": f"{restaurant.get('suburb', '')}, {restaurant.get('city', '')}",
            }
        )

    for cuisine in _ranked(list(cuisines), normalized, lambda c: c):
        suggestions.append({"kind": "cuisine", "label": cuisine})

    for city in _ranked(city_list, normalized, lambda c: c["label"]):
        suggestions.append(
            {"kind": "city", "label": city["label"], "cityId": city["id"]}
        )

    for suburb in _ranked(list(suburbs), normalized, lambda s: s):
        suggestions.append({"kind": "suburb", "label": suburb})

    return suggestions[:limit]
