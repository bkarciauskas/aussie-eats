"""Search suggestion ranking (ported from src/lib/search-suggestions.ts)."""

from __future__ import annotations

import json
import math
from typing import Any, Callable, Optional, Sequence, TypeVar

from app.domain.cities import DEMO_CITIES, DemoCity

T = TypeVar("T")


def parse_cuisine_tags(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(tag) for tag in parsed]
    except (TypeError, json.JSONDecodeError):
        pass
    return [part.strip() for part in raw.split(",") if part.strip()]


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
