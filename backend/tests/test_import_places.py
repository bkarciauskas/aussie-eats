import json
import os

import pytest

from app.domain.cities import DEMO_CITIES
from app.domain.cuisine_menu_templates import resolve_cuisine_from_places
from app import import_places as ip
from tests.fake_mongo import FakeDB


def test_parse_args_defaults_and_filters():
    args = ip.parse_args([])
    assert args.per_city == 100
    assert args.city is None

    args = ip.parse_args(["--per-city=20", "--city=Melbourne"])
    assert args.per_city == 20
    assert args.city == "melbourne"


def test_resolve_cuisine_from_places_matches_name_and_types():
    burger = resolve_cuisine_from_places(
        types=["restaurant"],
        primary_type="restaurant",
        display_name="Harbour Burger Co",
    )
    assert burger["templateKey"] == "Burgers"
    assert "Burgers" in burger["cuisineTags"]

    thai = resolve_cuisine_from_places(
        types=["thai_restaurant", "restaurant"],
        primary_type="thai_restaurant",
        display_name="Spice Lane",
    )
    assert thai["templateKey"] == "Thai"


def test_parse_au_address_extracts_suburb_state_postcode():
    city = DEMO_CITIES[0]
    parsed = ip.parse_au_address(
        "12 George St, The Rocks, NSW 2000, Australia",
        city,
    )
    assert parsed["suburb"] == "The Rocks"
    assert parsed["state"] == "NSW"
    assert parsed["postcode"] == "2000"


def test_periods_to_opening_hours_json():
    raw = {
        "open_now": True,
        "weekday_text": ["Monday: 9:00 AM – 5:00 PM"],
        "periods": [
            {
                "open": {"day": 1, "time": "0900"},
                "close": {"day": 1, "time": "1700"},
            }
        ],
    }
    encoded = ip.periods_to_opening_hours_json(raw)
    assert encoded is not None
    payload = json.loads(encoded)
    assert payload["openNow"] is True
    assert payload["periods"][0]["open"] == {"day": 1, "hour": 9, "minute": 0}
    assert payload["periods"][0]["close"] == {"day": 1, "hour": 17, "minute": 0}


@pytest.mark.asyncio
async def test_download_photo_skips_cached_file(tmp_path, monkeypatch):
    place_id = "ChIJcachedPhoto123"
    rel = f"/images/imported/{place_id}.jpg"
    abs_path = tmp_path / "public" / "images" / "imported" / f"{place_id}.jpg"
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(b"already-here")

    monkeypatch.setattr(ip, "PHOTO_DIR", abs_path.parent)
    monkeypatch.setattr(ip, "photo_paths", lambda _pid: (rel, abs_path))

    class BoomClient:
        async def get(self, *_args, **_kwargs):
            raise AssertionError("should not hit Places photo API when cached")

    result = await ip.download_photo(
        BoomClient(),
        key="fake",
        photo_reference="ref",
        place_id=place_id,
    )
    assert result == {"path": rel, "cached": True}
    assert abs_path.read_bytes() == b"already-here"


class _FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload
        self.status_code = 200
        self.content = b""

    def json(self):
        return self._payload


class _FakeClient:
    def __init__(self, details: dict):
        self.details = details
        self.calls: list[str] = []

    async def get(self, url: str, follow_redirects: bool = False):
        self.calls.append(url)
        if "/details/json" in url:
            return _FakeResponse({"status": "OK", "result": self.details})
        raise AssertionError(f"unexpected url {url}")


def _details_payload(place_id: str, name: str = "Harbour Burger Co") -> dict:
    return {
        "place_id": place_id,
        "name": name,
        "formatted_address": "1 Circular Quay, Sydney NSW 2000, Australia",
        "geometry": {"location": {"lat": -33.86, "lng": 151.21}},
        "rating": 4.6,
        "user_ratings_total": 120,
        "formatted_phone_number": "+61 2 0000 0000",
        "types": ["hamburger_restaurant", "restaurant"],
        "business_status": "OPERATIONAL",
        "opening_hours": {"open_now": True, "weekday_text": [], "periods": []},
        "photos": [],
        "editorial_summary": {"overview": "Smash burgers by the harbour."},
    }


@pytest.mark.asyncio
async def test_upsert_venue_creates_then_updates_by_place_id(monkeypatch):
    db = FakeDB()
    city = DEMO_CITIES[0]
    place_id = "ChIJTestPlaceUpsert1"
    details = _details_payload(place_id)
    client = _FakeClient(details)
    stats = {"created": 0, "updated": 0, "photosCached": 0, "photosDownloaded": 0}

    await ip.upsert_venue(
        db, client, key="fake", city=city, place_id=place_id, stats=stats
    )
    assert stats["created"] == 1
    assert stats["updated"] == 0
    created = await db.restaurants.find_one({"placeId": place_id})
    assert created is not None
    assert created["name"] == "Harbour Burger Co"
    assert created["city"] == "Sydney"
    assert created["isOpen"] is True
    assert await db.categories.count_documents({}) > 0
    assert await db.menu_items.count_documents({}) > 0
    original_id = created["id"]
    original_slug = created["slug"]
    category_count = await db.categories.count_documents({})

    details["name"] = "Harbour Burger Co Updated"
    details["rating"] = 4.9
    details["opening_hours"] = {"open_now": False, "weekday_text": [], "periods": []}
    stats2 = {"created": 0, "updated": 0, "photosCached": 0, "photosDownloaded": 0}
    await ip.upsert_venue(
        db, client, key="fake", city=city, place_id=place_id, stats=stats2
    )
    assert stats2["created"] == 0
    assert stats2["updated"] == 1
    updated = await db.restaurants.find_one({"placeId": place_id})
    assert updated is not None
    assert updated["id"] == original_id
    assert updated["slug"] == original_slug
    assert updated["name"] == "Harbour Burger Co Updated"
    assert updated["rating"] == 4.9
    # Point-in-time open_now must not close the durable checkout gate.
    assert updated["isOpen"] is True
    # Menus are insert-only; re-import must not duplicate categories.
    assert await db.categories.count_documents({}) == category_count
    assert await db.restaurants.count_documents({}) == 1


@pytest.mark.asyncio
async def test_upsert_venue_keeps_imported_image_when_photos_missing(tmp_path, monkeypatch):
    db = FakeDB()
    city = DEMO_CITIES[0]
    place_id = "ChIJTestPlacePhotoKeep"
    imported = f"/images/imported/{place_id}.jpg"
    abs_path = tmp_path / "public" / "images" / "imported" / f"{place_id}.jpg"
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(b"cached-photo")
    monkeypatch.setattr(ip, "PHOTO_DIR", abs_path.parent)
    monkeypatch.setattr(ip, "photo_paths", lambda _pid: (imported, abs_path))

    details = _details_payload(place_id)
    details["photos"] = [{"photo_reference": "ref-1"}]
    client = _FakeClient(details)
    stats = {"created": 0, "updated": 0, "photosCached": 0, "photosDownloaded": 0}
    await ip.upsert_venue(
        db, client, key="fake", city=city, place_id=place_id, stats=stats
    )
    created = await db.restaurants.find_one({"placeId": place_id})
    assert created is not None
    assert created["image"] == imported
    assert stats["photosCached"] == 1

    # Re-import with no photos must not wipe the cached imported path.
    details["photos"] = []
    abs_path.unlink()
    stats2 = {"created": 0, "updated": 0, "photosCached": 0, "photosDownloaded": 0}
    await ip.upsert_venue(
        db, client, key="fake", city=city, place_id=place_id, stats=stats2
    )
    updated = await db.restaurants.find_one({"placeId": place_id})
    assert updated is not None
    assert updated["image"] == imported


@pytest.mark.asyncio
async def test_fetch_search_page_retries_invalid_token_then_succeeds(monkeypatch):
    sleeps: list[float] = []

    async def fake_sleep(seconds):
        sleeps.append(seconds)

    monkeypatch.setattr(ip.asyncio, "sleep", fake_sleep)

    calls = {"n": 0}

    async def fetch(_token):
        calls["n"] += 1
        # First token attempt: not yet propagated; second: ready.
        if calls["n"] == 1:
            return {"status": "INVALID_REQUEST"}
        return {"status": "OK", "results": [{"place_id": "p1"}]}

    payload = await ip.fetch_search_page(fetch, page_token="tok", base_delay=2.0)
    assert payload is not None
    assert payload["results"][0]["place_id"] == "p1"
    assert calls["n"] == 2
    # Slept once before first token attempt, once between retries.
    assert len(sleeps) >= 2


@pytest.mark.asyncio
async def test_fetch_search_page_gives_up_on_persistent_invalid_token(monkeypatch):
    async def fake_sleep(_seconds):
        return None

    monkeypatch.setattr(ip.asyncio, "sleep", fake_sleep)

    async def fetch(_token):
        return {"status": "INVALID_REQUEST"}

    payload = await ip.fetch_search_page(fetch, page_token="tok", retries=2)
    assert payload is None


@pytest.mark.asyncio
async def test_fetch_search_page_first_page_error_raises():
    async def fetch(_token):
        return {"status": "INVALID_REQUEST", "error_message": "bad key"}

    with pytest.raises(RuntimeError, match="INVALID_REQUEST"):
        await ip.fetch_search_page(fetch, page_token=None)


@pytest.mark.asyncio
async def test_api_key_prefers_places_env(monkeypatch):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "places-key")
    monkeypatch.setenv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "maps-key")
    assert ip.api_key() == "places-key"

    monkeypatch.delenv("GOOGLE_PLACES_API_KEY")
    assert ip.api_key() == "maps-key"

    monkeypatch.delenv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
    with pytest.raises(RuntimeError, match="GOOGLE_PLACES_API_KEY"):
        ip.api_key()


def test_load_env_keeps_root_places_key_when_backend_env_empty(tmp_path, monkeypatch):
    backend_root = tmp_path / "backend"
    backend_root.mkdir()
    (tmp_path / ".env").write_text(
        "GOOGLE_PLACES_API_KEY=root-places-key\n"
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=root-maps-key\n"
        "MONGODB_URI=mongodb://from-root\n"
    )
    (backend_root / ".env").write_text(
        "MONGODB_URI=mongodb://from-backend\n"
        "GOOGLE_PLACES_API_KEY=\n"
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=\n"
    )
    monkeypatch.setattr(ip, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(ip, "BACKEND_ROOT", backend_root)
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)
    monkeypatch.delenv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", raising=False)
    monkeypatch.delenv("MONGODB_URI", raising=False)

    ip._load_env()
    assert os.environ["GOOGLE_PLACES_API_KEY"] == "root-places-key"
    assert os.environ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] == "root-maps-key"
    assert os.environ["MONGODB_URI"] == "mongodb://from-backend"
