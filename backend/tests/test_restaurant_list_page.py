"""Unit and HTTP tests for restaurant list page windows."""

from datetime import datetime, timezone

from app.domain.restaurant_list import RESTAURANT_LIST_PAGE_SIZE, page_window


def test_page_window_defaults_and_clamps():
    items = list(range(15))
    page_items, page, size, total = page_window(items, page=1, page_size=10)
    assert page_items == list(range(10))
    assert page == 1
    assert size == 10
    assert total == 15

    page_items, page, size, total = page_window(items, page=2, page_size=10)
    assert page_items == list(range(10, 15))
    assert page == 2
    assert size == 10
    assert total == 15


def test_page_window_clamps_page_size_and_page():
    items = list(range(15))
    _, _, size, _ = page_window(items, page=1, page_size=50)
    assert size == RESTAURANT_LIST_PAGE_SIZE

    _, _, size, _ = page_window(items, page=1, page_size=0)
    assert size == 1

    page_items, page, size, total = page_window(items, page=99, page_size=10)
    assert page == 2
    assert page_items == list(range(10, 15))
    assert size == 10
    assert total == 15

    page_items, page, size, total = page_window(items, page=0, page_size=10)
    assert page == 1
    assert page_items == list(range(10))


def test_page_window_empty_stays_on_page_one():
    page_items, page, size, total = page_window([], page=5, page_size=10)
    assert page_items == []
    assert page == 1
    assert size == 10
    assert total == 0


def _seed_restaurants(fake_db, count: int, *, name_prefix: str = "Venue"):
    now = datetime.now(timezone.utc)
    for i in range(count):
        n = i + 1
        fake_db.restaurants.docs.append(
            {
                "id": f"rest_page_{n}",
                "name": f"{name_prefix} {n:02d}",
                "slug": f"{name_prefix.lower()}-{n:02d}",
                "description": f"Desc {n}",
                "image": "/images/restaurants/burger.jpg",
                "cuisineTags": '["Burgers"]',
                "dietaryTags": "[]",
                "city": "Sydney",
                "suburb": "Bondi",
                "lat": -33.89,
                "lng": 151.27,
                "deliveryFeeCents": 499,
                "minOrderCents": 1500,
                "isOpen": True,
                "isActive": True,
                "rating": 5.0 - (n * 0.01),
                "placeId": None,
                "userRatingCount": n,
                "openingHoursJson": None,
                "phone": None,
                "createdAt": now,
                "updatedAt": now,
            }
        )


def test_restaurants_list_pages_at_ten(client, fake_db):
    _seed_restaurants(fake_db, 15)

    page1 = client.get("/restaurants")
    assert page1.status_code == 200
    body1 = page1.json()
    assert body1["total"] == 15
    assert body1["page"] == 1
    assert body1["pageSize"] == 10
    assert len(body1["restaurants"]) == 10
    page1_slugs = {r["slug"] for r in body1["restaurants"]}

    page2 = client.get("/restaurants?page=2")
    assert page2.status_code == 200
    body2 = page2.json()
    assert body2["total"] == 15
    assert body2["page"] == 2
    assert body2["pageSize"] == 10
    assert len(body2["restaurants"]) == 5
    page2_slugs = {r["slug"] for r in body2["restaurants"]}
    assert page1_slugs.isdisjoint(page2_slugs)


def test_restaurants_list_page_size_clamped(client, fake_db):
    _seed_restaurants(fake_db, 15)
    response = client.get("/restaurants?pageSize=50")
    assert response.status_code == 200
    body = response.json()
    assert body["pageSize"] == 10
    assert len(body["restaurants"]) == 10
    assert body["total"] == 15


def test_restaurants_search_also_pages(client, fake_db):
    _seed_restaurants(fake_db, 12, name_prefix="Matchable")
    fake_db.restaurants.docs.append(
        {
            "id": "rest_other",
            "name": "Unrelated Cafe",
            "slug": "unrelated-cafe",
            "description": "Coffee",
            "image": "/images/restaurants/burger.jpg",
            "cuisineTags": '["Cafe"]',
            "dietaryTags": "[]",
            "city": "Sydney",
            "suburb": "Surry Hills",
            "lat": -33.88,
            "lng": 151.21,
            "deliveryFeeCents": 399,
            "minOrderCents": 1000,
            "isOpen": True,
            "isActive": True,
            "rating": 4.0,
            "placeId": None,
            "userRatingCount": 1,
            "openingHoursJson": None,
            "phone": None,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
    )

    response = client.get("/restaurants?q=Matchable")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 12
    assert body["page"] == 1
    assert body["pageSize"] == 10
    assert len(body["restaurants"]) == 10
    assert all("matchable" in r["slug"] for r in body["restaurants"])


def test_restaurants_list_page_clamps_past_end(client, fake_db):
    _seed_restaurants(fake_db, 15)
    response = client.get("/restaurants?page=99")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 15
    assert body["page"] == 2
    assert len(body["restaurants"]) == 5
