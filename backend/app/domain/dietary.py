"""Dietary tag helpers used by admin menu upserts."""

from __future__ import annotations

import json
from typing import Iterable, Optional

DIET_IDS = ("vegan", "vegetarian", "gluten-free", "halal", "nut-free")
ALLERGEN_IDS = ("peanuts", "tree-nuts")

_DIET_SET = frozenset(DIET_IDS)
_ALLERGEN_SET = frozenset(ALLERGEN_IDS)


def parse_json_string_array(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return []
    if not isinstance(parsed, list):
        return []
    return [v for v in parsed if isinstance(v, str)]


def parse_dietary_tags(raw: Optional[str]) -> list[str]:
    return [tag for tag in parse_json_string_array(raw) if tag in _DIET_SET]


def serialize_tags(tags: Iterable[str]) -> str:
    return json.dumps(list(tags))


def union_dietary_tags(items: Iterable[dict]) -> list[str]:
    found: set[str] = set()
    for item in items:
        found.update(parse_dietary_tags(item.get("dietaryTags")))
    return [tag for tag in DIET_IDS if tag in found]


def filter_known_diets(tags: Iterable[str]) -> list[str]:
    return [tag for tag in DIET_IDS if tag in set(tags)]


def filter_known_allergens(tags: Iterable[str]) -> list[str]:
    return [tag for tag in ALLERGEN_IDS if tag in set(tags)]
