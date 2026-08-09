import pytest

from app import db as db_module


class FakeCursor:
    def __aiter__(self):
        self._iter = iter(())
        return self

    async def __anext__(self):
        raise StopAsyncIteration


class FakeCollection:
    def __init__(self, name: str, calls: list):
        self.name = name
        self._calls = calls

    async def create_index(self, keys, **kwargs):
        self._calls.append((self.name, keys, kwargs))

    def find(self, query=None):
        return FakeCursor()

    async def update_one(self, query, update):
        return None


class FakeDB:
    def __init__(self):
        self.calls: list = []
        self.users = FakeCollection("users", self.calls)
        self.addresses = FakeCollection("addresses", self.calls)
        self.restaurants = FakeCollection("restaurants", self.calls)
        self.favourites = FakeCollection("favourites", self.calls)
        self.categories = FakeCollection("categories", self.calls)
        self.menu_items = FakeCollection("menu_items", self.calls)
        self.orders = FakeCollection("orders", self.calls)
        self.order_items = FakeCollection("order_items", self.calls)
        self.reviews = FakeCollection("reviews", self.calls)


@pytest.mark.asyncio
async def test_ensure_indexes_covers_planned_collections(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(db_module, "get_db", lambda: fake)

    await db_module.ensure_indexes()

    collections = {name for name, _keys, _kwargs in fake.calls}
    assert collections == {
        "users",
        "addresses",
        "restaurants",
        "favourites",
        "categories",
        "menu_items",
        "orders",
        "order_items",
        "reviews",
    }

    unique_email = [
        kwargs
        for name, keys, kwargs in fake.calls
        if name == "users" and keys == "email"
    ]
    assert unique_email and unique_email[0].get("unique") is True

    app_id_collections = {
        "users",
        "addresses",
        "restaurants",
        "favourites",
        "categories",
        "menu_items",
        "orders",
        "order_items",
        "reviews",
    }
    for collection in app_id_collections:
        id_unique = [
            kwargs
            for name, keys, kwargs in fake.calls
            if name == collection and keys == "id"
        ]
        assert id_unique and id_unique[0].get("unique") is True, collection

    created_at = [
        kwargs
        for name, keys, kwargs in fake.calls
        if name == "orders" and keys == "createdAt"
    ]
    assert created_at

    favourite_compound = [
        keys
        for name, keys, kwargs in fake.calls
        if name == "favourites" and kwargs.get("unique") is True and keys != "id"
    ]
    assert favourite_compound

    review_order = [
        kwargs
        for name, keys, kwargs in fake.calls
        if name == "reviews" and keys == "orderId"
    ]
    assert review_order and review_order[0].get("unique") is True
