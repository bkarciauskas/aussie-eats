"""API request/response schemas for domain routers."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import OrderStatus, Role, UserPublic


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class SignupRequest(ApiModel):
    name: str
    email: str
    password: str


class LoginRequest(ApiModel):
    email: str
    password: str


class AuthResponse(ApiModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class OkResponse(ApiModel):
    ok: bool = True


class RestaurantSummary(ApiModel):
    id: str
    name: str
    slug: str
    description: str
    image: str
    cuisine_tags: str = Field(alias="cuisineTags")
    dietary_tags: str = Field(default="[]", alias="dietaryTags")
    city: str = "Sydney"
    suburb: str
    lat: float
    lng: float
    delivery_fee_cents: int = Field(alias="deliveryFeeCents")
    min_order_cents: int = Field(alias="minOrderCents")
    is_open: bool = Field(default=True, alias="isOpen")
    is_active: bool = Field(default=True, alias="isActive")
    rating: float = 4.5
    place_id: Optional[str] = Field(default=None, alias="placeId")
    user_rating_count: int = Field(default=0, alias="userRatingCount")
    opening_hours_json: Optional[str] = Field(default=None, alias="openingHoursJson")
    phone: Optional[str] = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class MenuItemOut(ApiModel):
    id: str
    category_id: str = Field(alias="categoryId")
    name: str
    description: str
    price_cents: int = Field(alias="priceCents")
    image: Optional[str] = None
    is_available: bool = Field(default=True, alias="isAvailable")
    dietary_tags: str = Field(default="[]", alias="dietaryTags")
    allergens: str = "[]"


class CategoryOut(ApiModel):
    id: str
    restaurant_id: str = Field(alias="restaurantId")
    name: str
    sort_order: int = Field(default=0, alias="sortOrder")
    items: list[MenuItemOut] = Field(default_factory=list)


class ReviewOut(ApiModel):
    id: str
    order_id: str = Field(alias="orderId")
    user_id: str = Field(alias="userId")
    restaurant_id: str = Field(alias="restaurantId")
    rating: int
    comment: str = ""
    created_at: datetime = Field(alias="createdAt")
    user_name: Optional[str] = Field(default=None, alias="userName")


class RestaurantDetail(RestaurantSummary):
    categories: list[CategoryOut] = Field(default_factory=list)
    reviews: list[ReviewOut] = Field(default_factory=list)


class DietaryCatalogItem(ApiModel):
    """Lean menu fields needed for browse diet matching."""

    dietary_tags: str = Field(default="[]", alias="dietaryTags")
    allergens: str = "[]"


class DietaryCatalogVenue(ApiModel):
    id: str
    menu_items: list[DietaryCatalogItem] = Field(
        default_factory=list, alias="menuItems"
    )


class DeliveryAddressIn(ApiModel):
    label: str = "Delivery"
    line1: str
    suburb: str
    state: str = "NSW"
    postcode: str
    phone: Optional[str] = None


class PlaceOrderItemIn(ApiModel):
    menu_item_id: str = Field(alias="menuItemId")
    quantity: int
    # Client unit prices are intentionally ignored at checkout.
    unit_price_cents: Optional[int] = Field(default=None, alias="unitPriceCents")


class CardPaymentIn(ApiModel):
    method: Literal["card"] = "card"
    card_last4: str = Field(alias="cardLast4")
    card_brand: str = Field(alias="cardBrand")


class SimplePaymentIn(ApiModel):
    method: Literal["pay_on_delivery", "apple_pay", "google_pay"]


class PlaceOrderRequest(ApiModel):
    restaurant_id: str = Field(alias="restaurantId")
    items: list[PlaceOrderItemIn]
    address: DeliveryAddressIn
    payment: dict[str, Any]


class PlaceOrderResponse(ApiModel):
    order_id: str = Field(alias="orderId")


class OrderItemOut(ApiModel):
    id: str
    order_id: str = Field(alias="orderId")
    menu_item_id: Optional[str] = Field(default=None, alias="menuItemId")
    name: str
    unit_price_cents: int = Field(alias="unitPriceCents")
    quantity: int


class OrderOut(ApiModel):
    id: str
    user_id: str = Field(alias="userId")
    restaurant_id: str = Field(alias="restaurantId")
    status: OrderStatus
    status_history_json: str = Field(alias="statusHistoryJson")
    subtotal_cents: int = Field(alias="subtotalCents")
    delivery_fee_cents: int = Field(alias="deliveryFeeCents")
    total_cents: int = Field(alias="totalCents")
    delivery_address: str = Field(alias="deliveryAddress")
    payment_method: str = Field(alias="paymentMethod")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    items: list[OrderItemOut] = Field(default_factory=list)
    restaurant: Optional[RestaurantSummary] = None
    review: Optional[ReviewOut] = None
    user: Optional[UserPublic] = None


class UpdateOrderStatusRequest(ApiModel):
    status: OrderStatus


class FavouriteIdsResponse(ApiModel):
    restaurant_ids: list[str] = Field(alias="restaurantIds")


class ToggleFavouriteResponse(ApiModel):
    ok: bool = True
    is_favourite: bool = Field(alias="isFavourite")


class SubmitReviewRequest(ApiModel):
    order_id: str = Field(alias="orderId")
    rating: int
    comment: Optional[str] = None


class RestaurantUpsertRequest(ApiModel):
    id: Optional[str] = None
    name: str
    description: str
    city: str = "Sydney"
    suburb: str
    cuisine_tags: list[str] = Field(default_factory=list, alias="cuisineTags")
    image: str = "/images/restaurants/burger.jpg"
    delivery_fee_cents: int = Field(alias="deliveryFeeCents")
    min_order_cents: int = Field(alias="minOrderCents")
    rating: float = 4.5
    phone: Optional[str] = None
    is_open: bool = Field(default=True, alias="isOpen")
    is_active: bool = Field(default=True, alias="isActive")
    lat: float = -33.8688
    lng: float = 151.2093


class ToggleActiveRequest(ApiModel):
    is_active: bool = Field(alias="isActive")


class CategoryUpsertRequest(ApiModel):
    id: Optional[str] = None
    restaurant_id: str = Field(alias="restaurantId")
    name: str
    sort_order: int = Field(default=0, alias="sortOrder")


class MenuItemUpsertRequest(ApiModel):
    id: Optional[str] = None
    restaurant_id: str = Field(alias="restaurantId")
    category_id: str = Field(alias="categoryId")
    name: str
    description: str = ""
    price_cents: int = Field(alias="priceCents")
    image: Optional[str] = None
    is_available: bool = Field(default=True, alias="isAvailable")
    dietary_tags: list[str] = Field(default_factory=list, alias="dietaryTags")
    allergens: list[str] = Field(default_factory=list)


class ToggleAvailabilityRequest(ApiModel):
    is_available: bool = Field(alias="isAvailable")


class AdminDashboardResponse(ApiModel):
    restaurant_count: int = Field(alias="restaurantCount")
    open_orders: int = Field(alias="openOrders")
    customer_count: int = Field(alias="customerCount")
    recent_orders: list[OrderOut] = Field(default_factory=list, alias="recentOrders")


class SearchSuggestResponse(ApiModel):
    suggestions: list[dict[str, Any]]


class ErrorBody(ApiModel):
    detail: str


class RoleOut(ApiModel):
    role: Role
