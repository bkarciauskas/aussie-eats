from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Role(str, Enum):
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"


class OrderStatus(str, Enum):
    pending = "pending"
    preparing = "preparing"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    cancelled = "cancelled"


class MongoModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class User(MongoModel):
    id: str
    email: str
    password_hash: str = Field(alias="passwordHash")
    name: str
    role: Role = Role.CUSTOMER
    is_guest: bool = Field(default=False, alias="isGuest")
    created_at: datetime = Field(alias="createdAt")


class UserPublic(MongoModel):
    id: str
    email: str
    name: str
    role: Role
    is_guest: bool = Field(default=False, alias="isGuest")


class Address(MongoModel):
    id: str
    user_id: str = Field(alias="userId")
    label: str
    line1: str
    suburb: str
    state: str = "NSW"
    postcode: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class Restaurant(MongoModel):
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


class Favourite(MongoModel):
    id: str
    user_id: str = Field(alias="userId")
    restaurant_id: str = Field(alias="restaurantId")
    created_at: datetime = Field(alias="createdAt")


class Category(MongoModel):
    id: str
    restaurant_id: str = Field(alias="restaurantId")
    name: str
    sort_order: int = Field(default=0, alias="sortOrder")


class MenuItem(MongoModel):
    id: str
    category_id: str = Field(alias="categoryId")
    name: str
    description: str
    price_cents: int = Field(alias="priceCents")
    image: Optional[str] = None
    is_available: bool = Field(default=True, alias="isAvailable")
    dietary_tags: str = Field(default="[]", alias="dietaryTags")
    allergens: str = "[]"


class StatusHistoryEntry(MongoModel):
    status: OrderStatus
    at: datetime


class Order(MongoModel):
    id: str
    user_id: str = Field(alias="userId")
    restaurant_id: str = Field(alias="restaurantId")
    status: OrderStatus = OrderStatus.pending
    status_history_json: str = Field(default="[]", alias="statusHistoryJson")
    subtotal_cents: int = Field(alias="subtotalCents")
    delivery_fee_cents: int = Field(alias="deliveryFeeCents")
    total_cents: int = Field(alias="totalCents")
    delivery_address: str = Field(alias="deliveryAddress")
    payment_method: str = Field(default="Pay on delivery", alias="paymentMethod")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class OrderItem(MongoModel):
    id: str
    order_id: str = Field(alias="orderId")
    menu_item_id: Optional[str] = Field(default=None, alias="menuItemId")
    name: str
    unit_price_cents: int = Field(alias="unitPriceCents")
    quantity: int


class Review(MongoModel):
    id: str
    order_id: str = Field(alias="orderId")
    user_id: str = Field(alias="userId")
    restaurant_id: str = Field(alias="restaurantId")
    rating: int
    comment: str = ""
    created_at: datetime = Field(alias="createdAt")


class TokenPayload(MongoModel):
    sub: str
    email: str
    name: str
    role: Role
    is_guest: bool = Field(default=False, alias="isGuest")
    exp: Optional[int] = None
