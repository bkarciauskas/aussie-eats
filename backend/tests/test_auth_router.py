def test_signup_login_me_and_logout(client, fake_db):
    signup = client.post(
        "/auth/signup",
        json={
            "name": "Casey",
            "email": "casey@example.com",
            "password": "secret12",
        },
    )
    assert signup.status_code == 201
    body = signup.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "casey@example.com"
    assert body["user"]["role"] == "CUSTOMER"
    token = body["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["name"] == "Casey"

    login = client.post(
        "/auth/login",
        json={"email": "casey@example.com", "password": "secret12"},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]

    bad = client.post(
        "/auth/login",
        json={"email": "casey@example.com", "password": "wrong"},
    )
    assert bad.status_code == 401

    logout = client.post("/auth/logout")
    assert logout.status_code == 200
    assert logout.json() == {"ok": True}

    assert len(fake_db.users.docs) == 1


def test_signup_rejects_duplicate_email(client, customer_user):
    response = client.post(
        "/auth/signup",
        json={
            "name": "Other",
            "email": customer_user["email"],
            "password": "secret12",
        },
    )
    assert response.status_code == 409


def test_signup_upgrades_guest_and_preserves_user_id(client, fake_db):
    guest = client.post(
        "/auth/guest",
        json={"name": "Alex Guest", "email": "alex.guest@example.com"},
    )
    assert guest.status_code == 201, guest.text
    guest_id = guest.json()["user"]["id"]

    signup = client.post(
        "/auth/signup",
        json={
            "name": "Alex Account",
            "email": "alex.guest@example.com",
            "password": "secret12",
        },
    )
    assert signup.status_code == 201, signup.text
    body = signup.json()
    assert body["user"]["id"] == guest_id
    assert body["user"]["name"] == "Alex Account"
    assert body["user"]["isGuest"] is False

    stored = next(u for u in fake_db.users.docs if u["id"] == guest_id)
    assert stored["isGuest"] is False
    assert len(fake_db.users.docs) == 1

    login = client.post(
        "/auth/login",
        json={"email": "alex.guest@example.com", "password": "secret12"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["id"] == guest_id
    assert login.json()["user"]["isGuest"] is False


def test_guest_session_creates_owner_and_places_order(
    client,
    seed_catalog,
    fake_db,
):
    guest = client.post(
        "/auth/guest",
        json={"name": "Alex Guest", "email": "alex.guest@example.com"},
    )
    assert guest.status_code == 201, guest.text
    body = guest.json()
    assert body["user"]["email"] == "alex.guest@example.com"
    assert body["user"]["isGuest"] is True
    token = body["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["isGuest"] is True

    order = client.post(
        "/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "restaurantId": "rest_1",
            "items": [
                {"menuItemId": "item_1", "quantity": 1},
                {"menuItemId": "item_2", "quantity": 1},
            ],
            "address": {
                "label": "Home",
                "line1": "1 Test St",
                "suburb": "Bondi",
                "state": "NSW",
                "postcode": "2026",
            },
            "payment": {"method": "pay_on_delivery"},
        },
    )
    assert order.status_code == 201, order.text
    order_id = order.json()["orderId"]
    stored = next(o for o in fake_db.orders.docs if o["id"] == order_id)
    assert stored["userId"] == body["user"]["id"]

    resumed = client.post(
        "/auth/guest",
        json={"name": "Alex G", "email": "alex.guest@example.com"},
    )
    assert resumed.status_code == 201
    assert resumed.json()["user"]["id"] == body["user"]["id"]
    assert resumed.json()["user"]["name"] == "Alex G"
    assert len([u for u in fake_db.users.docs if u.get("isGuest")]) == 1


def test_guest_session_rejects_existing_account_email(client, customer_user):
    response = client.post(
        "/auth/guest",
        json={"name": "Nope", "email": customer_user["email"]},
    )
    assert response.status_code == 409
    assert "log in" in response.json()["detail"].lower()


def test_guest_session_requires_name_and_email(client):
    missing_name = client.post(
        "/auth/guest",
        json={"name": "  ", "email": "guest@example.com"},
    )
    assert missing_name.status_code == 400

    bad_email = client.post(
        "/auth/guest",
        json={"name": "Guest", "email": "not-an-email"},
    )
    assert bad_email.status_code == 400
