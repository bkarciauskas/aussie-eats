from datetime import datetime, timezone

import pytest

from app.db import SEARCH_INDEX_NAME
from app.domain.orders import initial_status_history
from app.routers import search as search_module
from tests.fake_mongo import FakeCursor


def test_restaurants_list_and_detail(client, seed_catalog):
    listed = client.get("/restaurants")
    assert listed.status_code == 200
    body = listed.json()
    assert len(body["restaurants"]) == 1
    assert body["restaurants"][0]["slug"] == "bondi-burger-co"
    assert "Burgers" in body["availableCuisines"]

    detail = client.get("/restaurants/bondi-burger-co")
    assert detail.status_code == 200
    detail_body = detail.json()
    assert detail_body["name"] == "Bondi Burger Co"
    assert len(detail_body["categories"]) == 1
    assert len(detail_body["categories"][0]["items"]) == 2


def test_restaurants_list_filters_city_cuisine_q_diet(client, seed_catalog, fake_db):
    now = datetime.now(timezone.utc)
    fake_db.restaurants.docs.append(
        {
            "id": "rest_melb",
            "name": "Melbourne Ramen",
            "slug": "melbourne-ramen",
            "description": "Tonkotsu",
            "image": "/images/restaurants/ramen.jpg",
            "cuisineTags": '["Ramen","Japanese"]',
            "dietaryTags": "[]",
            "city": "Melbourne",
            "suburb": "CBD",
            "lat": -37.81,
            "lng": 144.96,
            "deliveryFeeCents": 499,
            "minOrderCents": 1500,
            "isOpen": True,
            "isActive": True,
            "rating": 4.6,
            "placeId": None,
            "userRatingCount": 10,
            "openingHoursJson": None,
            "phone": None,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    fake_db.categories.docs.append(
        {
            "id": "cat_melb",
            "restaurantId": "rest_melb",
            "name": "Bowls",
            "sortOrder": 0,
        }
    )
    fake_db.menu_items.docs.append(
        {
            "id": "item_vegan",
            "categoryId": "cat_melb",
            "name": "Vegan Bowl",
            "description": "Tofu",
            "priceCents": 1800,
            "image": None,
            "isAvailable": True,
            "dietaryTags": '["vegan","vegetarian","nut-free"]',
            "allergens": "[]",
        }
    )

    by_city = client.get("/restaurants?city=melbourne")
    assert by_city.status_code == 200
    city_body = by_city.json()
    assert [r["slug"] for r in city_body["restaurants"]] == ["melbourne-ramen"]
    assert set(city_body["availableCuisines"]) == {"Japanese", "Ramen"}

    by_cuisine = client.get("/restaurants?cuisine=Burgers")
    assert [r["slug"] for r in by_cuisine.json()["restaurants"]] == ["bondi-burger-co"]

    by_q = client.get("/restaurants?q=bondi")
    assert [r["slug"] for r in by_q.json()["restaurants"]] == ["bondi-burger-co"]

    by_diet = client.get("/restaurants?diet=vegan")
    assert [r["slug"] for r in by_diet.json()["restaurants"]] == ["melbourne-ramen"]


def test_dietary_catalog_returns_lean_menu_tags(client, seed_catalog):
    response = client.get("/restaurants/dietary-catalog")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == "rest_1"
    assert body[0]["menuItems"] == [
        {"dietaryTags": "[]", "allergens": "[]"},
        {"dietaryTags": '["vegetarian"]', "allergens": "[]"},
    ]
    # Must not collide with /restaurants/{slug}
    assert "categories" not in body[0]
    assert "reviews" not in body[0]


def test_favourites_toggle_and_list(client, seed_catalog, customer_headers):
    empty = client.get("/favourites", headers=customer_headers)
    assert empty.status_code == 200
    assert empty.json()["restaurantIds"] == []

    toggled = client.post(
        "/favourites/rest_1/toggle",
        headers=customer_headers,
    )
    assert toggled.status_code == 200
    assert toggled.json()["isFavourite"] is True

    listed = client.get("/favourites", headers=customer_headers)
    assert listed.json()["restaurantIds"] == ["rest_1"]

    restaurants = client.get("/favourites/restaurants", headers=customer_headers)
    assert restaurants.status_code == 200
    assert restaurants.json()[0]["id"] == "rest_1"

    again = client.post("/favourites/rest_1/toggle", headers=customer_headers)
    assert again.json()["isFavourite"] is False


def test_review_submit_on_delivered_order(
    client,
    seed_catalog,
    customer_user,
    customer_headers,
    fake_db,
):
    now = datetime.now(timezone.utc)
    fake_db.orders.docs.append(
        {
            "id": "order_rev",
            "userId": customer_user["id"],
            "restaurantId": "rest_1",
            "status": "delivered",
            "statusHistoryJson": initial_status_history(now),
            "subtotalCents": 2000,
            "deliveryFeeCents": 499,
            "totalCents": 2499,
            "deliveryAddress": "{}",
            "paymentMethod": "Pay on delivery",
            "createdAt": now,
            "updatedAt": now,
        }
    )

    response = client.post(
        "/reviews",
        headers=customer_headers,
        json={"orderId": "order_rev", "rating": 5, "comment": "Ripper!"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["rating"] == 5
    assert fake_db.restaurants.docs[0]["userRatingCount"] == 1


def test_review_rejects_non_delivered_order(
    client,
    seed_catalog,
    customer_user,
    customer_headers,
    fake_db,
):
    now = datetime.now(timezone.utc)
    fake_db.orders.docs.append(
        {
            "id": "order_open",
            "userId": customer_user["id"],
            "restaurantId": "rest_1",
            "status": "preparing",
            "statusHistoryJson": initial_status_history(now),
            "subtotalCents": 2000,
            "deliveryFeeCents": 499,
            "totalCents": 2499,
            "deliveryAddress": "{}",
            "paymentMethod": "Pay on delivery",
            "createdAt": now,
            "updatedAt": now,
        }
    )

    response = client.post(
        "/reviews",
        headers=customer_headers,
        json={"orderId": "order_open", "rating": 4, "comment": "Too early"},
    )
    assert response.status_code == 400
    assert "delivered" in response.json()["detail"].lower()


def test_admin_menu_crud(client, seed_catalog, admin_headers, fake_db):
    created = client.post(
        "/admin/menu-items",
        headers=admin_headers,
        json={
            "restaurantId": "rest_1",
            "categoryId": "cat_1",
            "name": "Onion Rings",
            "description": "Crispy",
            "priceCents": 650,
            "isAvailable": True,
            "dietaryTags": ["vegetarian"],
            "allergens": [],
        },
    )
    assert created.status_code == 200
    item_id = created.json()["id"]
    assert created.json()["priceCents"] == 650
    assert created.json()["dietaryTags"] == '["vegetarian"]'

    toggled = client.patch(
        f"/admin/menu-items/{item_id}/availability",
        headers=admin_headers,
        json={"isAvailable": False},
    )
    assert toggled.status_code == 200
    stored = next(i for i in fake_db.menu_items.docs if i["id"] == item_id)
    assert stored["isAvailable"] is False
    assert stored["dietaryTags"] == ["vegetarian"]
    venue = next(r for r in fake_db.restaurants.docs if r["id"] == "rest_1")
    assert isinstance(venue["dietaryTags"], list)
    assert "vegetarian" in venue["dietaryTags"]


def test_search_suggest(client, seed_catalog):
    empty = client.get("/search/suggest?q=")
    assert empty.status_code == 200
    assert empty.json() == {"suggestions": []}

    response = client.get("/search/suggest?q=bondi")
    assert response.status_code == 200
    suggestions = response.json()["suggestions"]
    assert any(s["kind"] == "restaurant" and s["slug"] == "bondi-burger-co" for s in suggestions)


@pytest.fixture(autouse=True)
def _reset_atlas_search_cache():
    search_module._atlas_ready = None
    search_module._atlas_checked_at = 0.0
    yield
    search_module._atlas_ready = None
    search_module._atlas_checked_at = 0.0


@pytest.mark.asyncio
async def test_atlas_candidates_awaits_async_aggregate():
    """Async PyMongo aggregate() returns a coroutine; iterating it without await raises TypeError."""

    class _AsyncAggregateCollection:
        async def aggregate(self, pipeline):
            assert pipeline[0]["$search"]["index"] == SEARCH_INDEX_NAME
            return FakeCursor(
                [
                    {
                        "name": "Bondi Burger Co",
                        "slug": "bondi-burger-co",
                        "suburb": "Bondi",
                        "city": "Sydney",
                        "cuisineTags": '["Burgers"]',
                    }
                ]
            )

    class _Db:
        restaurants = _AsyncAggregateCollection()

    candidates = await search_module._atlas_candidates(_Db(), "bondi")
    assert candidates[0]["slug"] == "bondi-burger-co"


def test_search_suggest_atlas_path(client, seed_catalog, fake_db):
    async def _list_search_indexes():
        return FakeCursor(
            [{"name": SEARCH_INDEX_NAME, "queryable": True, "status": "READY"}]
        )

    fake_db.restaurants.list_search_indexes = _list_search_indexes

    response = client.get("/search/suggest?q=bondi")
    assert response.status_code == 200
    suggestions = response.json()["suggestions"]
    assert any(s["kind"] == "restaurant" and s["slug"] == "bondi-burger-co" for s in suggestions)
    assert search_module._atlas_ready is True


def test_openapi_lists_domain_routes(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    expected = [
        "/auth/login",
        "/auth/signup",
        "/auth/logout",
        "/auth/me",
        "/restaurants",
        "/restaurants/dietary-catalog",
        "/restaurants/{slug}",
        "/orders",
        "/orders/{order_id}",
        "/favourites",
        "/favourites/{restaurant_id}/toggle",
        "/reviews",
        "/admin/restaurants",
        "/admin/menu-items",
        "/admin/orders/{order_id}/status",
        "/search/suggest",
    ]
    for path in expected:
        assert path in paths, f"missing OpenAPI path {path}"
