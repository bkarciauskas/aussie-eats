from datetime import datetime, timezone

from app.domain.orders import initial_status_history
from app.models import OrderStatus


def test_place_order_recomputes_prices_from_db(
    client,
    seed_catalog,
    customer_headers,
    fake_db,
):
    response = client.post(
        "/orders",
        headers=customer_headers,
        json={
            "restaurantId": "rest_1",
            "items": [
                {
                    "menuItemId": "item_1",
                    "quantity": 1,
                    "unitPriceCents": 1,  # hostile / stale client price — ignored
                },
                {
                    "menuItemId": "item_2",
                    "quantity": 2,
                    "unitPriceCents": 99999,
                },
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
    assert response.status_code == 201, response.text
    order_id = response.json()["orderId"]

    order = next(o for o in fake_db.orders.docs if o["id"] == order_id)
    # DB prices: 1200 + 2*500 = 2200; delivery 499
    assert order["subtotalCents"] == 2200
    assert order["deliveryFeeCents"] == 499
    assert order["totalCents"] == 2699
    assert order["status"] == "pending"

    lines = [i for i in fake_db.order_items.docs if i["orderId"] == order_id]
    assert sorted(line["unitPriceCents"] for line in lines) == [500, 1200]


def test_place_order_rejects_below_min_order(
    client,
    seed_catalog,
    customer_headers,
):
    response = client.post(
        "/orders",
        headers=customer_headers,
        json={
            "restaurantId": "rest_1",
            "items": [{"menuItemId": "item_2", "quantity": 1}],
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
    assert response.status_code == 400
    assert "Minimum order" in response.json()["detail"]


def test_invalid_status_transition_rejected(
    client,
    admin_headers,
    customer_user,
    seed_catalog,
    fake_db,
):
    now = datetime.now(timezone.utc)
    fake_db.orders.docs.append(
        {
            "id": "order_1",
            "userId": customer_user["id"],
            "restaurantId": "rest_1",
            "status": OrderStatus.pending.value,
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

    bad = client.patch(
        "/admin/orders/order_1/status",
        headers=admin_headers,
        json={"status": "delivered"},
    )
    assert bad.status_code == 400
    assert "Cannot change status" in bad.json()["detail"]

    ok = client.patch(
        "/admin/orders/order_1/status",
        headers=admin_headers,
        json={"status": "preparing"},
    )
    assert ok.status_code == 200
    assert fake_db.orders.docs[0]["status"] == "preparing"


def test_customer_cannot_update_order_status(
    client,
    customer_headers,
    customer_user,
    seed_catalog,
    fake_db,
):
    now = datetime.now(timezone.utc)
    fake_db.orders.docs.append(
        {
            "id": "order_2",
            "userId": customer_user["id"],
            "restaurantId": "rest_1",
            "status": "pending",
            "statusHistoryJson": "[]",
            "subtotalCents": 2000,
            "deliveryFeeCents": 499,
            "totalCents": 2499,
            "deliveryAddress": "{}",
            "paymentMethod": "Pay on delivery",
            "createdAt": now,
            "updatedAt": now,
        }
    )
    response = client.patch(
        "/admin/orders/order_2/status",
        headers=customer_headers,
        json={"status": "preparing"},
    )
    assert response.status_code == 403
