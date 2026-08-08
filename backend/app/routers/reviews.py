from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.deps import CurrentUser, DbDep
from app.domain.reviews import (
    blend_restaurant_rating,
    normalize_review_comment,
    parse_review_rating,
)
from app.ids import new_id
from app.models import OrderStatus
from app.mongo_util import strip_mongo_id
from app.schemas import OkResponse, ReviewOut, SubmitReviewRequest

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def submit_review(
    body: SubmitReviewRequest,
    user: CurrentUser,
    db: DbDep,
) -> ReviewOut:
    rating = parse_review_rating(body.rating)
    if rating is None:
        raise HTTPException(
            status_code=400,
            detail="Choose a rating between 1 and 5 stars.",
        )

    comment = normalize_review_comment(body.comment)
    order_id = body.order_id.strip()
    if not order_id:
        raise HTTPException(status_code=404, detail="Order not found.")

    order = strip_mongo_id(
        await db.orders.find_one({"id": order_id, "userId": user.id})
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.get("status") != OrderStatus.delivered.value:
        raise HTTPException(
            status_code=400,
            detail="You can only review delivered orders.",
        )

    existing = await db.reviews.find_one({"orderId": order["id"]})
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this order.",
        )

    restaurant = strip_mongo_id(
        await db.restaurants.find_one({"id": order["restaurantId"]})
    )
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    next_rating, user_rating_count = blend_restaurant_rating(
        float(restaurant.get("rating", 0)),
        int(restaurant.get("userRatingCount", 0)),
        rating,
    )

    now = datetime.now(timezone.utc)
    review_doc = {
        "id": new_id(),
        "orderId": order["id"],
        "userId": user.id,
        "restaurantId": order["restaurantId"],
        "rating": rating,
        "comment": comment,
        "createdAt": now,
    }
    try:
        await db.reviews.insert_one(review_doc)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this order.",
        ) from exc

    await db.restaurants.update_one(
        {"id": restaurant["id"]},
        {
            "$set": {
                "rating": next_rating,
                "userRatingCount": user_rating_count,
                "updatedAt": now,
            }
        },
    )
    return ReviewOut.model_validate(review_doc)
