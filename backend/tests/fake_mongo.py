"""Minimal async in-memory Mongo stand-in for router tests."""

from __future__ import annotations

import copy
from typing import Any, Optional


def _match(doc: dict[str, Any], query: dict[str, Any]) -> bool:
    for key, expected in query.items():
        actual = doc.get(key)
        if isinstance(expected, dict):
            if "$in" in expected:
                if actual not in expected["$in"]:
                    return False
            else:
                return False
        elif actual != expected:
            return False
    return True


class FakeUpdateResult:
    def __init__(self, matched_count: int):
        self.matched_count = matched_count


class FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]):
        self._docs = docs
        self._sort_keys: list[tuple[str, int]] = []
        self._limit: Optional[int] = None

    def sort(self, keys: list[tuple[str, int]]):
        self._sort_keys = keys
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def _materialize(self) -> list[dict[str, Any]]:
        docs = list(self._docs)
        if self._sort_keys:
            for key, direction in reversed(self._sort_keys):
                docs.sort(key=lambda d: d.get(key), reverse=direction < 0)
        if self._limit is not None:
            docs = docs[: self._limit]
        return docs

    def __aiter__(self):
        self._iter = iter(self._materialize())
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class FakeCollection:
    def __init__(self):
        self.docs: list[dict[str, Any]] = []

    async def find_one(self, query: dict[str, Any]) -> Optional[dict[str, Any]]:
        for doc in self.docs:
            if _match(doc, query):
                return copy.deepcopy(doc)
        return None

    def find(self, query: Optional[dict[str, Any]] = None) -> FakeCursor:
        query = query or {}
        matched = [copy.deepcopy(d) for d in self.docs if _match(d, query)]
        return FakeCursor(matched)

    async def insert_one(self, doc: dict[str, Any]):
        self.docs.append(copy.deepcopy(doc))

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]):
        for doc in self.docs:
            if _match(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                return FakeUpdateResult(1)
        return FakeUpdateResult(0)

    async def delete_one(self, query: dict[str, Any]):
        for index, doc in enumerate(self.docs):
            if _match(doc, query):
                self.docs.pop(index)
                return FakeUpdateResult(1)
        return FakeUpdateResult(0)

    async def count_documents(self, query: Optional[dict[str, Any]] = None) -> int:
        query = query or {}
        return sum(1 for doc in self.docs if _match(doc, query))

    async def create_index(self, *_args, **_kwargs):
        return None


class FakeDB:
    def __init__(self):
        self.users = FakeCollection()
        self.addresses = FakeCollection()
        self.restaurants = FakeCollection()
        self.favourites = FakeCollection()
        self.categories = FakeCollection()
        self.menu_items = FakeCollection()
        self.orders = FakeCollection()
        self.order_items = FakeCollection()
        self.reviews = FakeCollection()
