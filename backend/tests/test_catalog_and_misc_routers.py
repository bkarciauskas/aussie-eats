from datetime import datetime, timezone

from app.domain.orders import initial_status_history


def test_restaurants_list_and_detail(client, seed_catalog):
    listed = client.get("/restaurants")
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["slug"] == "bondi-burger-co"

    detail = client.get("/restaurants/bondi-burger-co")
    assert detail.status_code == 200
    body = detail.json()
    assert body["name"] == "Bondi Burger Co"
    assert len(body["categories"]) == 1
    assert len(body["categories"][0]["items"]) == 2


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

    toggled = client.patch(
        f"/admin/menu-items/{item_id}/availability",
        headers=admin_headers,
        json={"isAvailable": False},
    )
    assert toggled.status_code == 200
    stored = next(i for i in fake_db.menu_items.docs if i["id"] == item_id)
    assert stored["isAvailable"] is False


def test_search_suggest(client, seed_catalog):
    empty = client.get("/search/suggest?q=")
    assert empty.status_code == 200
    assert empty.json() == {"suggestions": []}

    response = client.get("/search/suggest?q=bondi")
    assert response.status_code == 200
    suggestions = response.json()["suggestions"]
    assert any(s["kind"] == "restaurant" and s["slug"] == "bondi-burger-co" for s in suggestions)


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
