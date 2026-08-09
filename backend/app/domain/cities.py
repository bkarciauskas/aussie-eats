"""Demo city pins used by search suggest (ported from src/lib/cities.ts)."""

from __future__ import annotations

from typing import TypedDict


class DemoCity(TypedDict):
    id: str
    label: str
    suburb: str
    state: str
    postcode: str
    lat: float
    lng: float


DEMO_CITIES: list[DemoCity] = [
    {
        "id": "sydney",
        "label": "Sydney",
        "suburb": "Sydney",
        "state": "NSW",
        "postcode": "2000",
        "lat": -33.8688,
        "lng": 151.2093,
    },
    {
        "id": "melbourne",
        "label": "Melbourne",
        "suburb": "Melbourne",
        "state": "VIC",
        "postcode": "3000",
        "lat": -37.8136,
        "lng": 144.9631,
    },
    {
        "id": "brisbane",
        "label": "Brisbane",
        "suburb": "Brisbane",
        "state": "QLD",
        "postcode": "4000",
        "lat": -27.4698,
        "lng": 153.0251,
    },
    {
        "id": "perth",
        "label": "Perth",
        "suburb": "Perth",
        "state": "WA",
        "postcode": "6000",
        "lat": -31.9505,
        "lng": 115.8605,
    },
    {
        "id": "adelaide",
        "label": "Adelaide",
        "suburb": "Adelaide",
        "state": "SA",
        "postcode": "5000",
        "lat": -34.9285,
        "lng": 138.6007,
    },
    {
        "id": "hobart",
        "label": "Hobart",
        "suburb": "Hobart",
        "state": "TAS",
        "postcode": "7000",
        "lat": -42.8821,
        "lng": 147.3272,
    },
]


def find_demo_city(id_or_label: str | None) -> DemoCity | None:
    if not id_or_label:
        return None
    key = id_or_label.strip().lower()
    for city in DEMO_CITIES:
        if city["id"] == key or city["label"].lower() == key:
            return city
    return None


def matches_restaurant_city(
    restaurant_city: str,
    city_filter: str | None,
) -> bool:
    """Unknown city values are ignored so stale URLs don't zero results."""
    if not city_filter:
        return True
    wanted = find_demo_city(city_filter)
    if wanted is None:
        return True
    return restaurant_city.lower() == wanted["label"].lower()
