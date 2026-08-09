"""Dietary tag helpers used by admin menu upserts and browse filters."""

from __future__ import annotations

import json
from typing import Any, Iterable, Optional, Union

DIET_IDS = ("vegan", "vegetarian", "gluten-free", "halal", "nut-free")
ALLERGEN_IDS = ("peanuts", "tree-nuts")

_DIET_SET = frozenset(DIET_IDS)
_ALLERGEN_SET = frozenset(ALLERGEN_IDS)

TagRaw = Union[str, list, None]


def coerce_tag_list(raw: TagRaw) -> list[str]:
    """Dual-read tag fields stored as JSON strings or native Mongo arrays."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return [v for v in raw if isinstance(v, str)]
    if not isinstance(raw, str) or not raw:
        return []
    try:
        parsed = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return []
    if not isinstance(parsed, list):
        return []
    return [v for v in parsed if isinstance(v, str)]


def parse_json_string_array(raw: Optional[str]) -> list[str]:
    return coerce_tag_list(raw)


def parse_dietary_tags(raw: TagRaw) -> list[str]:
    return [tag for tag in coerce_tag_list(raw) if tag in _DIET_SET]


def parse_allergens(raw: TagRaw) -> list[str]:
    return [tag for tag in coerce_tag_list(raw) if tag in _ALLERGEN_SET]


def serialize_tags(tags: Iterable[str]) -> str:
    return json.dumps(list(tags))


def tags_for_storage(tags: Iterable[str]) -> list[str]:
    return list(tags)


def union_dietary_tags(items: Iterable[dict]) -> list[str]:
    found: set[str] = set()
    for item in items:
        found.update(parse_dietary_tags(item.get("dietaryTags")))
    return [tag for tag in DIET_IDS if tag in found]


def filter_known_diets(tags: Iterable[str]) -> list[str]:
    return [tag for tag in DIET_IDS if tag in set(tags)]


def filter_known_allergens(tags: Iterable[str]) -> list[str]:
    return [tag for tag in ALLERGEN_IDS if tag in set(tags)]


def item_matches_diets(item: dict[str, Any], diets: Iterable[str]) -> bool:
    """Every selected diet must be explicitly tagged on the item."""
    diet_list = [d for d in diets if d in _DIET_SET]
    if not diet_list:
        return True
    tags = set(parse_dietary_tags(item.get("dietaryTags")))
    return all(diet in tags for diet in diet_list)


def restaurant_matches_diets(
    menu_items: Iterable[dict[str, Any]],
    diets: Iterable[str],
) -> bool:
    """Venue matches when one menu item satisfies every selected diet."""
    diet_list = [d for d in diets if d in _DIET_SET]
    if not diet_list:
        return True
    return any(item_matches_diets(item, diet_list) for item in menu_items)
