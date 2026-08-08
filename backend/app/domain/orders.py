"""Order status transitions and line quantity rules (ported from src/lib/orders.ts)."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Any, Optional

from app.models import OrderStatus

ALLOWED_TRANSITIONS: dict[OrderStatus, list[OrderStatus]] = {
    OrderStatus.pending: [OrderStatus.preparing, OrderStatus.cancelled],
    OrderStatus.preparing: [OrderStatus.out_for_delivery, OrderStatus.cancelled],
    OrderStatus.out_for_delivery: [OrderStatus.delivered, OrderStatus.cancelled],
    OrderStatus.delivered: [],
    OrderStatus.cancelled: [],
}

MAX_LINE_QUANTITY = 99


def can_transition(from_status: OrderStatus, to_status: OrderStatus) -> bool:
    return to_status in ALLOWED_TRANSITIONS[from_status]


def parse_order_line_quantity(raw_qty: Any) -> Optional[int]:
    try:
        n = float(raw_qty)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(n):
        return None
    quantity = math.floor(n)
    if quantity < 1 or quantity > MAX_LINE_QUANTITY:
        return None
    return quantity


def parse_status_history(raw: Optional[str]) -> list[dict[str, str]]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return []
    if not isinstance(parsed, list):
        return []
    out: list[dict[str, str]] = []
    for entry in parsed:
        if not isinstance(entry, dict):
            continue
        status = entry.get("status")
        at = entry.get("at")
        if isinstance(status, str) and isinstance(at, str):
            out.append({"status": status, "at": at})
    return out


def append_status_history(
    raw: Optional[str],
    status: OrderStatus,
    at: Optional[datetime] = None,
) -> str:
    history = parse_status_history(raw)
    stamp = at or datetime.now(timezone.utc)
    history.append(
        {"status": status.value, "at": stamp.isoformat().replace("+00:00", "Z")}
    )
    return json.dumps(history)


def initial_status_history(at: Optional[datetime] = None) -> str:
    stamp = at or datetime.now(timezone.utc)
    return json.dumps(
        [
            {
                "status": OrderStatus.pending.value,
                "at": stamp.isoformat().replace("+00:00", "Z"),
            }
        ]
    )
