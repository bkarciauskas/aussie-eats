"""Helpers for Mongo documents that mirror Prisma camelCase fields."""

from __future__ import annotations

from typing import Any, Optional


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
