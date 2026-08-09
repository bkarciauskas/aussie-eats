from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.deps import AdminUser, CurrentUser, DbDep
from app.domain.orders import (
    append_status_history,
    can_transition,
    initial_status_history,
    parse_order_line_quantity,
)
from app.domain.payment import (
    format_card_payment_label,
    is_card_brand,
    parse_payment_method,
    payment_method_label,
)
from app.ids import new_id
from app.models import OrderStatus, Role, UserPublic
from app.mongo_util import normalize_tags_for_api, strip_mongo_id
from app.schemas import (
    OkResponse,
    OrderItemOut,
    OrderOut,
    PlaceOrderRequest,
    PlaceOrderResponse,
    RestaurantSummary,
    ReviewOut,
    UpdateOrderStatusRequest,
)

router = APIRouter(tags=["orders"])


async def _load_order_items(db, order_id: str) -> list[OrderItemOut]:
    items: list[OrderItemOut] = []
    cursor = db.order_items.find({"orderId": order_id})
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            items.append(OrderItemOut.model_validate(cleaned))
    return items


def _user_public(doc: dict) -> UserPublic:
    return UserPublic(
        id=doc["id"],
        email=doc["email"],
        name=doc["name"],
        role=Role(doc.get("role", Role.CUSTOMER)),
        is_guest=bool(doc.get("isGuest", False)),
    )


async def _orders_out_many(
    db,
    orders: list[dict],
    *,
    include_restaurant: bool = True,
    include_review: bool = True,
    include_user: bool = False,
) -> list[OrderOut]:
    if not orders:
        return []

    order_ids = [order["id"] for order in orders]
    items_by_order: dict[str, list[OrderItemOut]] = defaultdict(list)
    async for doc in db.order_items.find({"orderId": {"$in": order_ids}}):
        cleaned = strip_mongo_id(doc)
        if cleaned:
            items_by_order[cleaned["orderId"]].append(OrderItemOut.model_validate(cleaned))

    restaurants_by_id: dict[str, RestaurantSummary] = {}
    if include_restaurant:
        restaurant_ids = list({order["restaurantId"] for order in orders})
        if restaurant_ids:
            async for doc in db.restaurants.find({"id": {"$in": restaurant_ids}}):
                cleaned = strip_mongo_id(doc)
                if cleaned:
                    restaurants_by_id[cleaned["id"]] = RestaurantSummary.model_validate(
                        normalize_tags_for_api(cleaned)
                    )

    reviews_by_order: dict[str, ReviewOut] = {}
    if include_review:
        async for doc in db.reviews.find({"orderId": {"$in": order_ids}}):
            cleaned = strip_mongo_id(doc)
            if cleaned:
                reviews_by_order[cleaned["orderId"]] = ReviewOut.model_validate(cleaned)

    users_by_id: dict[str, UserPublic] = {}
    if include_user:
        user_ids = list({order["userId"] for order in orders})
        if user_ids:
            async for doc in db.users.find({"id": {"$in": user_ids}}):
                cleaned = strip_mongo_id(doc)
                if cleaned:
                    users_by_id[cleaned["id"]] = _user_public(cleaned)

    return [
        OrderOut.model_validate(
            {
                **order,
                "items": items_by_order.get(order["id"], []),
                "restaurant": restaurants_by_id.get(order["restaurantId"])
                if include_restaurant
                else None,
                "review": reviews_by_order.get(order["id"]) if include_review else None,
                "user": users_by_id.get(order["userId"]) if include_user else None,
            }
        )
        for order in orders
    ]


async def _order_out(
    db,
    order: dict,
    *,
    include_restaurant: bool = True,
    include_review: bool = True,
    include_user: bool = False,
) -> OrderOut:
    results = await _orders_out_many(
        db,
        [order],
        include_restaurant=include_restaurant,
        include_review=include_review,
        include_user=include_user,
    )
    return results[0]


def _resolve_payment_method(payment: dict) -> str:
    method_id = parse_payment_method(payment.get("method"))
    if method_id is None:
        raise HTTPException(status_code=400, detail="Please choose a valid payment method.")
    if method_id != "card":
        return payment_method_label(method_id)

    card_last4 = payment.get("cardLast4") or payment.get("card_last4")
    card_brand = payment.get("cardBrand") or payment.get("card_brand")
    if not isinstance(card_last4, str) or not is_card_brand(card_brand):
        raise HTTPException(status_code=400, detail="Please complete the card details.")
    label = format_card_payment_label(brand=str(card_brand), last4=card_last4)
    if label is None:
        raise HTTPException(status_code=400, detail="Please complete the card details.")
    return label


@router.post("/orders", response_model=PlaceOrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    body: PlaceOrderRequest,
    user: CurrentUser,
    db: DbDep,
) -> PlaceOrderResponse:
    if not body.items:
        raise HTTPException(status_code=400, detail="Your cart is empty.")

    payment_method = _resolve_payment_method(body.payment)

    restaurant = strip_mongo_id(
        await db.restaurants.find_one({"id": body.restaurant_id, "isActive": True})
    )
    if restaurant is None or not restaurant.get("isOpen", True):
        raise HTTPException(
            status_code=400,
            detail="This restaurant is not available right now.",
        )

    menu_item_ids = [line.menu_item_id for line in body.items]
    unique_ids = set(menu_item_ids)

    # Load available items for this restaurant and recompute prices from DB.
    categories = [
        strip_mongo_id(doc)
        async for doc in db.categories.find({"restaurantId": restaurant["id"]})
    ]
    category_ids = {c["id"] for c in categories if c}
    menu_docs: dict[str, dict] = {}
    if unique_ids and category_ids:
        cursor = db.menu_items.find(
            {
                "id": {"$in": list(unique_ids)},
                "isAvailable": True,
                "categoryId": {"$in": list(category_ids)},
            }
        )
        async for doc in cursor:
            cleaned = strip_mongo_id(doc)
            if cleaned:
                menu_docs[cleaned["id"]] = cleaned

    if len(menu_docs) != len(unique_ids):
        raise HTTPException(
            status_code=400,
            detail="Some items are unavailable. Please refresh the menu.",
        )

    subtotal_cents = 0
    order_items: list[dict] = []
    for line in body.items:
        quantity = parse_order_line_quantity(line.quantity)
        if quantity is None:
            raise HTTPException(
                status_code=400,
                detail="Invalid quantity in cart. Please refresh and try again.",
            )
        item = menu_docs.get(line.menu_item_id)
        if item is None:
            raise HTTPException(
                status_code=400,
                detail="Some items are unavailable. Please refresh the menu.",
            )
        # Never trust client unitPriceCents — charge DB priceCents only.
        unit_price = int(item["priceCents"])
        subtotal_cents += unit_price * quantity
        order_items.append(
            {
                "menuItemId": item["id"],
                "name": item["name"],
                "unitPriceCents": unit_price,
                "quantity": quantity,
            }
        )

    min_order = int(restaurant.get("minOrderCents", 0))
    if subtotal_cents < min_order:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order is {(min_order / 100):.2f} AUD before delivery.",
        )

    addr = body.address
    if not addr.line1.strip() or not addr.suburb.strip() or not addr.postcode.strip():
        raise HTTPException(status_code=400, detail="Please complete the delivery address.")

    delivery_fee = int(restaurant.get("deliveryFeeCents", 0))
    total_cents = subtotal_cents + delivery_fee
    now = datetime.now(timezone.utc)
    order_id = new_id()

    order_doc = {
        "id": order_id,
        "userId": user.id,
        "restaurantId": restaurant["id"],
        "status": OrderStatus.pending.value,
        "statusHistoryJson": initial_status_history(now),
        "subtotalCents": subtotal_cents,
        "deliveryFeeCents": delivery_fee,
        "totalCents": total_cents,
        "deliveryAddress": json.dumps(
            {
                "label": addr.label or "Delivery",
                "line1": addr.line1.strip(),
                "suburb": addr.suburb.strip(),
                "state": addr.state or "NSW",
                "postcode": addr.postcode.strip(),
                "phone": addr.phone.strip() if addr.phone else None,
            }
        ),
        "paymentMethod": payment_method,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.orders.insert_one(order_doc)

    for line in order_items:
        await db.order_items.insert_one(
            {
                "id": new_id(),
                "orderId": order_id,
                **line,
            }
        )

    return PlaceOrderResponse(orderId=order_id)


@router.get("/orders", response_model=list[OrderOut])
async def list_my_orders(user: CurrentUser, db: DbDep) -> list[OrderOut]:
    orders: list[dict] = []
    cursor = db.orders.find({"userId": user.id}).sort([("createdAt", -1)])
    async for doc in cursor:
        cleaned = strip_mongo_id(doc)
        if cleaned:
            orders.append(cleaned)
    return await _orders_out_many(db, orders)


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_my_order(order_id: str, user: CurrentUser, db: DbDep) -> OrderOut:
    order = strip_mongo_id(
        await db.orders.find_one({"id": order_id, "userId": user.id})
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return await _order_out(db, order)


@router.patch("/admin/orders/{order_id}/status", response_model=OkResponse)
async def update_order_status(
    order_id: str,
    body: UpdateOrderStatusRequest,
    _admin: AdminUser,
    db: DbDep,
) -> OkResponse:
    order = strip_mongo_id(await db.orders.find_one({"id": order_id}))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")

    try:
        current = OrderStatus(order["status"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid status.") from exc

    if not can_transition(current, body.status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change status from {current.value} to {body.status.value}.",
        )

    now = datetime.now(timezone.utc)
    history = append_status_history(order.get("statusHistoryJson"), body.status, now)
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": body.status.value,
                "statusHistoryJson": history,
                "updatedAt": now,
            }
        },
    )
    return OkResponse(ok=True)
