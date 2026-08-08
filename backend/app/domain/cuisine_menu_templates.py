"""Cuisine-templated demo menus for Places ingest.

Ported from prisma/cuisine-menu-templates.ts. Templates are exported to JSON via
`npm run db:export-cuisine-templates` so the Python ingest stays in sync.
"""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path
from typing import Any, Optional

from app.domain.tag_menu_item import tag_menu_categories

_TEMPLATES_PATH = Path(__file__).with_name("cuisine_menu_templates.json")
_TEMPLATES: Optional[dict[str, list[dict[str, Any]]]] = None

_TYPE_TO_CUISINE: list[tuple[re.Pattern[str], str, list[str]]] = [
    (re.compile(r"hamburger|burger", re.I), "Burgers", ["Burgers", "American", "Fast food"]),
    (re.compile(r"thai", re.I), "Thai", ["Thai", "Asian", "Noodles"]),
    (re.compile(r"pizza", re.I), "Pizza", ["Pizza", "Italian", "Casual"]),
    (re.compile(r"italian|pasta", re.I), "Italian", ["Italian", "Pasta", "Casual"]),
    (re.compile(r"cafe|coffee|brunch", re.I), "Cafe", ["Cafe", "Brunch", "Coffee"]),
    (re.compile(r"sushi", re.I), "Sushi", ["Sushi", "Japanese", "Seafood"]),
    (re.compile(r"japanese|ramen|izakaya", re.I), "Japanese", ["Japanese", "Asian"]),
    (re.compile(r"indian|curry", re.I), "Indian", ["Indian", "Curry", "Vegetarian"]),
    (re.compile(r"mexican|taco|burrito", re.I), "Mexican", ["Mexican", "Street food"]),
    (re.compile(r"bakery|pastry|dessert", re.I), "Bakery", ["Bakery", "Pastries", "Cafe"]),
    (re.compile(r"seafood|fish", re.I), "Seafood", ["Seafood", "Fish & chips", "Casual"]),
    (re.compile(r"chinese|dim.?sum", re.I), "Default", ["Chinese", "Asian"]),
    (re.compile(r"vietnamese|pho", re.I), "Default", ["Vietnamese", "Asian", "Noodles"]),
    (re.compile(r"korean", re.I), "Default", ["Korean", "Asian"]),
    (re.compile(r"greek|mediterranean", re.I), "Default", ["Mediterranean", "Casual"]),
    (re.compile(r"steak|grill|bbq|barbecue", re.I), "Default", ["Grill", "Casual"]),
]


def _load_templates() -> dict[str, list[dict[str, Any]]]:
    global _TEMPLATES
    if _TEMPLATES is None:
        payload = json.loads(_TEMPLATES_PATH.read_text(encoding="utf-8"))
        templates = payload.get("templates")
        if not isinstance(templates, dict):
            raise ValueError("cuisine_menu_templates.json must contain a templates object")
        _TEMPLATES = templates
    return _TEMPLATES


def resolve_cuisine_from_places(
    *,
    types: list[str],
    primary_type: Optional[str] = None,
    display_name: str,
) -> dict[str, Any]:
    haystack = " ".join([primary_type or "", *types, display_name])
    for pattern, key, tags in _TYPE_TO_CUISINE:
        if pattern.search(haystack):
            return {"templateKey": key, "cuisineTags": tags}
    return {"templateKey": "Default", "cuisineTags": ["Restaurant", "Casual"]}


def menu_for_cuisine(template_key: str) -> list[dict[str, Any]]:
    templates = _load_templates()
    return copy.deepcopy(templates.get(template_key) or templates["Default"])


def clone_menu_categories(template_key: str) -> tuple[list[dict[str, Any]], str]:
    """Deep-clone and tag menu categories for Mongo create payloads."""
    return tag_menu_categories(menu_for_cuisine(template_key), template_key)
