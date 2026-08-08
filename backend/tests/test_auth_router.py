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
