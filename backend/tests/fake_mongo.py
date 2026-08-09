"""Minimal async in-memory Mongo stand-in for router tests."""

from __future__ import annotations

import copy
import re
from typing import Any, Optional


def _match(doc: dict[str, Any], query: dict[str, Any]) -> bool:
    for key, expected in query.items():
        actual = doc.get(key)
        if isinstance(expected, dict):
            if "$in" in expected:
                if actual not in expected["$in"]:
                    return False
            elif "$regex" in expected:
                flags = re.IGNORECASE if "i" in str(expected.get("$options", "")) else 0
                if not isinstance(actual, str) or re.search(
                    str(expected["$regex"]), actual, flags
                ) is None:
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

    async def to_list(self, length: Optional[int] = None) -> list[dict[str, Any]]:
        docs = self._materialize()
        if length is None:
            return docs
        return docs[:length]

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

    def find(
        self,
        query: Optional[dict[str, Any]] = None,
        projection: Optional[dict[str, Any]] = None,
    ) -> FakeCursor:
        query = query or {}
        matched = [copy.deepcopy(d) for d in self.docs if _match(d, query)]
        if projection:
            include = {k for k, v in projection.items() if v}
            projected: list[dict[str, Any]] = []
            for doc in matched:
                projected.append({k: doc[k] for k in include if k in doc})
            matched = projected
        return FakeCursor(matched)

    async def insert_one(self, doc: dict[str, Any]):
        self.docs.append(copy.deepcopy(doc))

    async def insert_many(self, docs: list[dict[str, Any]]):
        for doc in docs:
            self.docs.append(copy.deepcopy(doc))

    async def update_one(self, query: dict[str, Any], update: dict[str, Any] | list[dict[str, Any]]):
        for doc in self.docs:
            if not _match(doc, query):
                continue
            if isinstance(update, list):
                # Support status-transition aggregation pipelines used by admin PATCH.
                stage = update[0].get("$set", {}) if update else {}
                new_status = stage.get("status")
                at = stage.get("updatedAt")
                if isinstance(new_status, str) and at is not None:
                    from app.domain.orders import OrderStatus, append_status_history

                    doc["status"] = new_status
                    doc["updatedAt"] = at
                    doc["statusHistoryJson"] = append_status_history(
                        doc.get("statusHistoryJson"),
                        OrderStatus(new_status),
                        at,
                    )
                    return FakeUpdateResult(1)
                return FakeUpdateResult(0)
            if "$set" in update:
                doc.update(update["$set"])
            if "$push" in update:
                for key, value in update["$push"].items():
                    doc.setdefault(key, []).append(copy.deepcopy(value))
            return FakeUpdateResult(1)
        return FakeUpdateResult(0)

    async def delete_one(self, query: dict[str, Any]):
        for index, doc in enumerate(self.docs):
            if _match(doc, query):
                self.docs.pop(index)
                return FakeUpdateResult(1)
        return FakeUpdateResult(0)

    async def delete_many(self, query: Optional[dict[str, Any]] = None):
        query = query or {}
        kept = [doc for doc in self.docs if not _match(doc, query)]
        deleted = len(self.docs) - len(kept)
        self.docs = kept
        return FakeUpdateResult(deleted)

    async def count_documents(self, query: Optional[dict[str, Any]] = None) -> int:
        query = query or {}
        return sum(1 for doc in self.docs if _match(doc, query))

    async def aggregate(self, pipeline: list[dict[str, Any]]) -> FakeCursor:
        # Async PyMongo returns an awaitable cursor from aggregate(); mirror that
        # so callers that `await collection.aggregate(...)` work in tests.
        docs = [copy.deepcopy(d) for d in self.docs]
        for stage in pipeline:
            if "$group" in stage:
                group = stage["$group"]
                key_expr = group["_id"]
                field = key_expr[1:] if isinstance(key_expr, str) and key_expr.startswith("$") else None
                buckets: dict[Any, dict[str, Any]] = {}
                for doc in docs:
                    key = doc.get(field) if field else None
                    bucket = buckets.setdefault(key, {"_id": key, "count": 0})
                    if "count" in group:
                        bucket["count"] += 1
                docs = list(buckets.values())
            elif "$sort" in stage:
                for key, direction in reversed(list(stage["$sort"].items())):
                    docs.sort(key=lambda d, k=key: d.get(k), reverse=direction < 0)
            elif "$limit" in stage:
                docs = docs[: int(stage["$limit"])]
            elif "$project" in stage:
                include = {k for k, v in stage["$project"].items() if v}
                docs = [{k: doc[k] for k in include if k in doc} for doc in docs]
            elif "$search" in stage:
                # Atlas Search is not emulated; keep the current doc set so
                # typeahead tests can exercise the awaited-aggregate path.
                continue
        return FakeCursor(docs)

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
