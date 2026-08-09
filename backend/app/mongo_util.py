"""Helpers for Mongo documents that mirror Prisma camelCase fields."""

from __future__ import annotations

import json
from typing import Any, Optional

_TAG_FIELDS = ("cuisineTags", "dietaryTags", "allergens")


def strip_mongo_id(doc: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if doc is None:
        return None
    data = dict(doc)
    data.pop("_id", None)
    return data


def ensure_id(doc: dict[str, Any], doc_id: str) -> dict[str, Any]:
    data = dict(doc)
    data["id"] = doc_id
    data.pop("_id", None)
    return data


def normalize_tags_for_api(doc: dict[str, Any]) -> dict[str, Any]:
    """JSON-stringify tag arrays so Pydantic schemas keep str fields."""
    data = dict(doc)
    for field in _TAG_FIELDS:
        value = data.get(field)
        if isinstance(value, list):
            data[field] = json.dumps(value)
    return data
