"""One-shot Google Places ingest → MongoDB (legacy Places API).

Usage (from backend/):
  python3 -m app.import_places
  python3 -m app.import_places --per-city=20 --city=sydney

Or from repo root:
  npm run db:import-places
  npm run db:import-places -- --city=melbourne --per-city=20
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from pymongo.asynchronous.database import AsyncDatabase

from app.db import close_db, connect_db, ensure_indexes
from app.domain.cities import DEMO_CITIES, DemoCity
from app.domain.cuisine_menu_templates import (
    clone_menu_categories,
    resolve_cuisine_from_places,
)
from app.ids import new_id

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
PHOTO_DIR = REPO_ROOT / "public" / "images" / "imported"
PLACES = "https://maps.googleapis.com/maps/api/place"

CUISINE_QUERIES = [
    "restaurant",
    "thai restaurant",
    "japanese restaurant",
    "italian restaurant",
    "indian restaurant",
    "chinese restaurant",
    "mexican restaurant",
    "burger restaurant",
    "pizza restaurant",
    "cafe",
    "seafood restaurant",
    "vietnamese restaurant",
    "korean restaurant",
    "bakery",
]

STATE_POST_RE = re.compile(
    r"\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b\s*(\d{4})?",
    re.I,
)
STATE_FIND_RE = re.compile(r"\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b", re.I)


def _load_env() -> None:
    # Places keys live in the repo-root .env; Mongo settings in backend/.env.
    load_dotenv(REPO_ROOT / ".env")
    places_key = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
    maps_key = os.environ.get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "").strip()
    load_dotenv(BACKEND_ROOT / ".env", override=True)
    # Empty GOOGLE_PLACES_API_KEY= (or Maps key) in backend/.env must not wipe a
    # non-empty value already loaded from the repo-root .env.
    if places_key and not os.environ.get("GOOGLE_PLACES_API_KEY", "").strip():
        os.environ["GOOGLE_PLACES_API_KEY"] = places_key
    if maps_key and not os.environ.get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "").strip():
        os.environ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] = maps_key


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Google Places venues into Mongo")
    parser.add_argument("--per-city", type=int, default=100, dest="per_city")
    parser.add_argument("--city", type=str, default=None)
    args = parser.parse_args(argv)
    if args.per_city <= 0:
        parser.error("--per-city must be a positive integer")
    if args.city:
        args.city = args.city.strip().lower()
    return args


def api_key() -> str:
    key = (
        os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
        or os.environ.get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "").strip()
    )
    if not key:
        raise RuntimeError(
            "Set GOOGLE_PLACES_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) in .env"
        )
    return key


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return slug.strip("-")[:60]


def offset_lat_lng(origin: dict[str, float], east_m: float, north_m: float) -> dict[str, float]:
    d_lat = north_m / 111_320
    d_lng = east_m / (111_320 * math.cos((origin["lat"] * math.pi) / 180))
    return {"lat": origin["lat"] + d_lat, "lng": origin["lng"] + d_lng}


def search_centers(city: DemoCity) -> list[dict[str, float]]:
    origin = {"lat": city["lat"], "lng": city["lng"]}
    ring = 2500
    return [
        origin,
        offset_lat_lng(origin, ring, 0),
        offset_lat_lng(origin, -ring, 0),
        offset_lat_lng(origin, 0, ring),
        offset_lat_lng(origin, 0, -ring),
        offset_lat_lng(origin, ring, ring),
        offset_lat_lng(origin, -ring, ring),
        offset_lat_lng(origin, ring, -ring),
        offset_lat_lng(origin, -ring, -ring),
    ]


def assert_places_ok(status: str, error_message: Optional[str] = None) -> None:
    if status in ("OK", "ZERO_RESULTS"):
        return
    if status in ("REQUEST_DENIED", "INVALID_REQUEST"):
        raise RuntimeError(
            f"Places API error ({status}): "
            f"{error_message or 'check API key / Places API enablement'}"
        )
    if status == "OVER_QUERY_LIMIT":
        raise RuntimeError(f"Places API quota exceeded: {error_message or status}")


def parse_au_address(
    formatted: str,
    fallback_city: DemoCity,
) -> dict[str, str]:
    parts = [p.strip() for p in formatted.split(",")]
    suburb = fallback_city["suburb"]
    state = fallback_city["state"]
    postcode = fallback_city["postcode"]

    state_post = next((p for p in parts if STATE_FIND_RE.search(p)), None)
    if state_post:
        match = STATE_POST_RE.search(state_post)
        if match:
            state = match.group(1).upper()
            if match.group(2):
                postcode = match.group(2)
        suburb_idx = parts.index(state_post) - 1
        if suburb_idx >= 0:
            suburb = parts[suburb_idx]
    elif len(parts) >= 2:
        suburb = parts[-2] or suburb

    return {"suburb": suburb, "state": state, "postcode": postcode}


def periods_to_opening_hours_json(opening: Optional[dict[str, Any]]) -> Optional[str]:
    if not opening:
        return None
    periods_out: list[dict[str, Any]] = []
    for period in opening.get("periods") or []:
        open_slot = period.get("open") or {}
        open_time = str(open_slot.get("time") or "0000")
        mapped: dict[str, Any] = {
            "open": {
                "day": open_slot.get("day", 0),
                "hour": int(open_time[:2]),
                "minute": int(open_time[2:] or "0"),
            }
        }
        close_slot = period.get("close")
        if close_slot:
            close_time = str(close_slot.get("time") or "0000")
            mapped["close"] = {
                "day": close_slot.get("day", 0),
                "hour": int(close_time[:2]),
                "minute": int(close_time[2:] or "0"),
            }
        periods_out.append(mapped)

    return json.dumps(
        {
            "openNow": opening.get("open_now"),
            "weekdayDescriptions": opening.get("weekday_text") or [],
            "periods": periods_out,
        }
    )


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


def delivery_fees(rating: float) -> dict[str, int]:
    delivery_fee_cents = (
        350 + round((5 - min(rating, 5)) * 80) + (50 if random.random() > 0.5 else 0)
    )
    min_order_cents = 1200 + round(random.random() * 1000)
    return {
        "deliveryFeeCents": min(750, max(299, delivery_fee_cents)),
        "minOrderCents": min(2500, max(1000, min_order_cents)),
    }


def photo_paths(place_id: str) -> tuple[str, Path]:
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", place_id)
    rel = f"/images/imported/{safe_id}.jpg"
    abs_path = REPO_ROOT / "public" / rel.lstrip("/")
    return rel, abs_path


async def download_photo(
    client: httpx.AsyncClient,
    *,
    key: str,
    photo_reference: str,
    place_id: str,
) -> dict[str, Any]:
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    rel, abs_path = photo_paths(place_id)
    if abs_path.exists():
        return {"path": rel, "cached": True}

    params = urlencode(
        {
            "maxheight": "800",
            "photo_reference": photo_reference,
            "key": key,
        }
    )
    res = await client.get(f"{PLACES}/photo?{params}", follow_redirects=True)
    if res.status_code >= 400 or not res.content:
        return {"path": "/images/restaurants/burger.jpg", "cached": False}
    abs_path.write_bytes(res.content)
    return {"path": rel, "cached": False}


async def fetch_json(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    res = await client.get(url)
    if res.status_code >= 400:
        raise RuntimeError(f"HTTP {res.status_code} for Places request")
    return res.json()


async def nearby_page(
    client: httpx.AsyncClient,
    *,
    key: str,
    center: dict[str, float],
    page_token: Optional[str] = None,
) -> dict[str, Any]:
    params: dict[str, str] = {
        "key": key,
        "location": f"{center['lat']},{center['lng']}",
        "radius": "3500",
        "type": "restaurant",
    }
    if page_token:
        params["pagetoken"] = page_token
    return await fetch_json(client, f"{PLACES}/nearbysearch/json?{urlencode(params)}")


async def text_search_page(
    client: httpx.AsyncClient,
    *,
    key: str,
    query: str,
    center: dict[str, float],
    page_token: Optional[str] = None,
) -> dict[str, Any]:
    params: dict[str, str] = {
        "key": key,
        "query": query,
        "location": f"{center['lat']},{center['lng']}",
        "radius": "4500",
        "type": "restaurant",
    }
    if page_token:
        params["pagetoken"] = page_token
    return await fetch_json(client, f"{PLACES}/textsearch/json?{urlencode(params)}")


async def place_details(
    client: httpx.AsyncClient,
    *,
    key: str,
    place_id: str,
) -> Optional[dict[str, Any]]:
    params = urlencode(
        {
            "key": key,
            "place_id": place_id,
            "fields": (
                "place_id,name,formatted_address,geometry,rating,user_ratings_total,"
                "formatted_phone_number,opening_hours,photos,types,business_status,"
                "editorial_summary"
            ),
        }
    )
    payload = await fetch_json(client, f"{PLACES}/details/json?{params}")
    assert_places_ok(payload.get("status", ""), payload.get("error_message"))
    return payload.get("result")


async def collect_place_ids_for_city(
    client: httpx.AsyncClient,
    *,
    key: str,
    city: DemoCity,
    per_city: int,
) -> set[str]:
    found: set[str] = set()
    centers = search_centers(city)

    def ingest_results(results: Optional[list[dict[str, Any]]]) -> None:
        for place in results or []:
            place_id = place.get("place_id")
            if not place_id:
                continue
            status = place.get("business_status")
            if status and status != "OPERATIONAL":
                continue
            found.add(place_id)
            if len(found) >= per_city:
                return

    for center in centers:
        if len(found) >= per_city:
            break
        page_token: Optional[str] = None
        for page in range(3):
            if page > 0:
                await asyncio.sleep(2)
            payload = await nearby_page(
                client, key=key, center=center, page_token=page_token
            )
            assert_places_ok(payload.get("status", ""), payload.get("error_message"))
            ingest_results(payload.get("results"))
            page_token = payload.get("next_page_token")
            if not page_token or len(found) >= per_city:
                break

    for cuisine in CUISINE_QUERIES:
        if len(found) >= per_city:
            break
        for center in centers[:4]:
            if len(found) >= per_city:
                break
            query = f"{cuisine} in {city['label']}"
            page_token = None
            for page in range(2):
                if page > 0:
                    await asyncio.sleep(2)
                payload = await text_search_page(
                    client,
                    key=key,
                    query=query,
                    center=center,
                    page_token=page_token,
                )
                assert_places_ok(payload.get("status", ""), payload.get("error_message"))
                ingest_results(payload.get("results"))
                page_token = payload.get("next_page_token")
                if not page_token or len(found) >= per_city:
                    break
                await asyncio.sleep(0.2)

    return found


async def upsert_venue(
    db: AsyncDatabase,
    client: httpx.AsyncClient,
    *,
    key: str,
    city: DemoCity,
    place_id: str,
    stats: dict[str, int],
) -> None:
    details = await place_details(client, key=key, place_id=place_id)
    if not details or not details.get("name"):
        return
    location = (details.get("geometry") or {}).get("location") or {}
    if location.get("lat") is None or location.get("lng") is None:
        return

    name = str(details["name"]).strip()
    lat = float(location["lat"])
    lng = float(location["lng"])
    address = (
        details.get("formatted_address")
        or details.get("vicinity")
        or f"{city['label']}, Australia"
    )
    suburb = parse_au_address(address, city)["suburb"]
    cuisine = resolve_cuisine_from_places(
        types=details.get("types") or [],
        primary_type=(details.get("types") or [None])[0],
        display_name=name,
    )
    template_key = cuisine["templateKey"]
    cuisine_tags = cuisine["cuisineTags"]

    image = fallback_image_for_cuisine(cuisine_tags)
    cached_rel, cached_abs = photo_paths(place_id)
    if cached_abs.exists():
        image = cached_rel
    photos = details.get("photos") or []
    photo_ref = (photos[0] or {}).get("photo_reference") if photos else None
    if photo_ref:
        try:
            photo = await download_photo(
                client,
                key=key,
                photo_reference=photo_ref,
                place_id=place_id,
            )
            if str(photo["path"]).startswith("/images/imported/"):
                image = photo["path"]
                if photo["cached"]:
                    stats["photosCached"] += 1
                else:
                    stats["photosDownloaded"] += 1
            await asyncio.sleep(0.05)
        except Exception:
            pass

    rating = float(details.get("rating") or 4.4)
    user_rating_count = int(details.get("user_ratings_total") or 0)
    opening = details.get("opening_hours") or {}
    # open_now is a point-in-time Places snapshot; do not persist it as the durable
    # isOpen gate used by checkout. Store hours in openingHoursJson instead.
    opening_hours_json = periods_to_opening_hours_json(opening)
    editorial = ((details.get("editorial_summary") or {}).get("overview") or "").strip()
    description = (
        editorial
        or f"{name} in {suburb}, {city['label']}. Order delivery with AussieEats."
    )
    fees = delivery_fees(rating)
    phone = details.get("formatted_phone_number")
    now = _utc_now()

    existing = await db.restaurants.find_one({"placeId": place_id})
    if (
        existing is not None
        and not str(image).startswith("/images/imported/")
    ):
        prev_image = existing.get("image")
        if isinstance(prev_image, str) and prev_image.startswith("/images/imported/"):
            image = prev_image
    if existing is not None:
        await db.restaurants.update_one(
            {"placeId": place_id},
            {
                "$set": {
                    "name": name,
                    "description": description,
                    "image": image,
                    "cuisineTags": json.dumps(cuisine_tags),
                    "city": city["label"],
                    "suburb": suburb,
                    "lat": lat,
                    "lng": lng,
                    "rating": rating,
                    "userRatingCount": user_rating_count,
                    "openingHoursJson": opening_hours_json,
                    "phone": phone,
                    "isOpen": True,
                    "isActive": True,
                    "updatedAt": now,
                }
            },
        )
        stats["updated"] += 1
        return

    slug = slugify(name)
    clash = await db.restaurants.find_one({"slug": slug})
    if clash is not None:
        slug = f"{slug}-{place_id[-6:].lower()}"

    categories, restaurant_dietary_tags = clone_menu_categories(template_key)
    restaurant_id = new_id()
    await db.restaurants.insert_one(
        {
            "id": restaurant_id,
            "placeId": place_id,
            "name": name,
            "slug": slug,
            "description": description,
            "image": image,
            "cuisineTags": json.dumps(cuisine_tags),
            "dietaryTags": restaurant_dietary_tags,
            "city": city["label"],
            "suburb": suburb,
            "lat": lat,
            "lng": lng,
            "deliveryFeeCents": fees["deliveryFeeCents"],
            "minOrderCents": fees["minOrderCents"],
            "rating": rating,
            "userRatingCount": user_rating_count,
            "openingHoursJson": opening_hours_json,
            "phone": phone,
            "isOpen": True,
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    for idx, cat in enumerate(categories):
        category_id = new_id()
        await db.categories.insert_one(
            {
                "id": category_id,
                "restaurantId": restaurant_id,
                "name": cat["name"],
                "sortOrder": idx,
            }
        )
        for item in cat["items"]:
            await db.menu_items.insert_one(
                {
                    "id": new_id(),
                    "categoryId": category_id,
                    "name": item["name"],
                    "description": item["description"],
                    "priceCents": item["priceCents"],
                    "image": item.get("image"),
                    "isAvailable": True,
                    "dietaryTags": item["dietaryTags"],
                    "allergens": item["allergens"],
                }
            )
    stats["created"] += 1


async def run_import(*, per_city: int, city_filter: Optional[str]) -> dict[str, int]:
    key = api_key()
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)

    cities = [
        city
        for city in DEMO_CITIES
        if not city_filter
        or city["id"] == city_filter
        or city["label"].lower() == city_filter
    ]
    if not cities:
        raise RuntimeError(f"No cities match filter: {city_filter}")

    print(
        f"Importing up to {per_city} restaurants/city for: "
        + ", ".join(city["label"] for city in cities)
    )
    print("Using Google Places API (legacy Nearby/Text/Details/Photo).")

    db = await connect_db()
    await ensure_indexes()

    totals = {
        "created": 0,
        "updated": 0,
        "photosCached": 0,
        "photosDownloaded": 0,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        for city in cities:
            print(f"\n=== {city['label']} ===")
            place_ids = await collect_place_ids_for_city(
                client, key=key, city=city, per_city=per_city
            )
            print(f"  collected {len(place_ids)} unique places")

            stats = {
                "created": 0,
                "updated": 0,
                "photosCached": 0,
                "photosDownloaded": 0,
            }
            for i, place_id in enumerate(place_ids, start=1):
                sys.stdout.write(f"  upsert {i}/{len(place_ids)}\r")
                sys.stdout.flush()
                await upsert_venue(
                    db, client, key=key, city=city, place_id=place_id, stats=stats
                )
                await asyncio.sleep(0.08)
            print(
                f"  done: created={stats['created']} updated={stats['updated']} "
                f"photos↓={stats['photosDownloaded']} cached={stats['photosCached']}"
            )
            for field in totals:
                totals[field] += stats[field]

    by_city: dict[str, int] = {}
    async for doc in db.restaurants.find({}, projection={"city": 1}):
        city_name = doc.get("city") or "Unknown"
        by_city[city_name] = by_city.get(city_name, 0) + 1

    print("\nImport complete:")
    print(f"  created={totals['created']} updated={totals['updated']}")
    print(
        f"  photos downloaded={totals['photosDownloaded']} "
        f"cached={totals['photosCached']}"
    )
    print(
        "  DB by city: "
        + ", ".join(f"{name} ({count})" for name, count in sorted(by_city.items()))
    )
    return totals


async def _amain(argv: Optional[list[str]] = None) -> None:
    _load_env()
    args = parse_args(argv)
    try:
        await run_import(per_city=args.per_city, city_filter=args.city)
    finally:
        await close_db()


def main(argv: Optional[list[str]] = None) -> None:
    asyncio.run(_amain(argv))


if __name__ == "__main__":
    main()
