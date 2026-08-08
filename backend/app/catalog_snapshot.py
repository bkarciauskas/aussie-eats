"""Frozen restaurant catalog snapshot: export from Mongo / restore on empty seed.

Browse always reads Mongo. This module makes a full catalog available without
re-running Google Places: commit `catalog_snapshot.json`, restore via db:seed.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from pymongo.asynchronous.database import AsyncDatabase

from app.mongo_util import strip_mongo_id

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
SNAPSHOT_PATH = Path(__file__).with_name("catalog_snapshot.json")
SNAPSHOT_VERSION = 1

_DATETIME_KEYS = frozenset({"createdAt", "updatedAt"})


def fallback_image_for_cuisine(tags: list[str]) -> str:
    joined = " ".join(tags).lower()
    if "burger" in joined:
        return "/images/restaurants/burger.jpg"
    if "thai" in joined:
        return "/images/restaurants/thai.jpg"
    if "pizza" in joined or "italian" in joined:
        return "/images/restaurants/pizza.jpg"
    if "cafe" in joined or "brunch" in joined:
        return "/images/restaurants/cafe.jpg"
    if "sushi" in joined or "japanese" in joined or "seafood" in joined:
        return "/images/restaurants/sushi.jpg"
    if "indian" in joined:
        return "/images/restaurants/indian.jpg"
    if "mexican" in joined:
        return "/images/restaurants/mexican.jpg"
    if "bakery" in joined:
        return "/images/restaurants/bakery.jpg"
    return "/images/restaurants/burger.jpg"


def _parse_cuisine_tags(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [t for t in raw if isinstance(t, str)]
    if not isinstance(raw, str) or not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return []
    if not isinstance(parsed, list):
        return []
    return [t for t in parsed if isinstance(t, str)]


def resolve_restaurant_image(doc: dict[str, Any], *, repo_root: Path = REPO_ROOT) -> str:
    """Keep imported photos when the file exists; otherwise cuisine stock art."""
    image = doc.get("image")
    tags = _parse_cuisine_tags(doc.get("cuisineTags"))
    fallback = fallback_image_for_cuisine(tags)
    if not isinstance(image, str) or not image.strip():
        return fallback
    if image.startswith("/images/imported/"):
        abs_path = repo_root / "public" / image.lstrip("/")
        if abs_path.is_file():
            return image
        return fallback
    return image


def _json_default(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _parse_datetime(value: Any) -> Any:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    return value


def serialize_docs(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for doc in docs:
        clean = strip_mongo_id(doc)
        assert clean is not None
        row = dict(clean)
        for key in _DATETIME_KEYS:
            if key in row:
                row[key] = _parse_datetime(row[key])
        out.append(row)
    return out


def docs_for_json(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Datetime → ISO strings for writing catalog_snapshot.json."""
    rows: list[dict[str, Any]] = []
    for doc in serialize_docs(docs):
        row = dict(doc)
        for key in _DATETIME_KEYS:
            if key in row and isinstance(row[key], datetime):
                row[key] = row[key].isoformat()
        rows.append(row)
    return rows


def docs_from_json(docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """ISO strings → datetime for Mongo insert."""
    rows: list[dict[str, Any]] = []
    for doc in docs:
        row = dict(doc)
        row.pop("_id", None)
        for key in _DATETIME_KEYS:
            if key in row:
                row[key] = _parse_datetime(row[key])
        rows.append(row)
    return rows


def build_snapshot_payload(
    *,
    restaurants: list[dict[str, Any]],
    categories: list[dict[str, Any]],
    menu_items: list[dict[str, Any]],
    exported_at: Optional[datetime] = None,
) -> dict[str, Any]:
    when = exported_at or datetime.now(timezone.utc)
    return {
        "version": SNAPSHOT_VERSION,
        "exportedAt": when.isoformat(),
        "restaurants": docs_for_json(restaurants),
        "categories": docs_for_json(categories),
        "menu_items": docs_for_json(menu_items),
    }


def write_snapshot(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, default=_json_default) + "\n",
        encoding="utf-8",
    )


def load_snapshot(path: Path = SNAPSHOT_PATH) -> Optional[dict[str, Any]]:
    if not path.is_file():
        return None
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path.name} must be a JSON object")
    restaurants = payload.get("restaurants")
    if not isinstance(restaurants, list) or not restaurants:
        return None
    categories = payload.get("categories")
    menu_items = payload.get("menu_items")
    if not isinstance(categories, list) or not isinstance(menu_items, list):
        raise ValueError(f"{path.name} must contain categories and menu_items arrays")
    return payload


async def export_catalog_from_db(
    db: AsyncDatabase,
    *,
    path: Path = SNAPSHOT_PATH,
) -> dict[str, int]:
    restaurants = [doc async for doc in db.restaurants.find({})]
    categories = [doc async for doc in db.categories.find({})]
    menu_items = [doc async for doc in db.menu_items.find({})]
    if not restaurants:
        raise RuntimeError("No restaurants in Mongo — nothing to export")

    payload = build_snapshot_payload(
        restaurants=restaurants,
        categories=categories,
        menu_items=menu_items,
    )
    write_snapshot(path, payload)
    return {
        "restaurants": len(payload["restaurants"]),
        "categories": len(payload["categories"]),
        "menu_items": len(payload["menu_items"]),
    }


async def _insert_many(collection: Any, docs: list[dict[str, Any]]) -> None:
    if not docs:
        return
    insert_many = getattr(collection, "insert_many", None)
    if insert_many is not None:
        await insert_many(docs)
        return
    for doc in docs:
        await collection.insert_one(doc)


async def restore_catalog_snapshot(
    db: AsyncDatabase,
    payload: dict[str, Any],
    *,
    repo_root: Path = REPO_ROOT,
) -> dict[str, int]:
    restaurants = docs_from_json(list(payload["restaurants"]))
    categories = docs_from_json(list(payload.get("categories") or []))
    menu_items = docs_from_json(list(payload.get("menu_items") or []))

    prepared_restaurants: list[dict[str, Any]] = []
    for doc in restaurants:
        row = dict(doc)
        row["image"] = resolve_restaurant_image(row, repo_root=repo_root)
        prepared_restaurants.append(row)

    await _insert_many(db.restaurants, prepared_restaurants)
    await _insert_many(db.categories, categories)
    await _insert_many(db.menu_items, menu_items)

    return {
        "restaurants": len(prepared_restaurants),
        "categories": len(categories),
        "menu_items": len(menu_items),
    }
