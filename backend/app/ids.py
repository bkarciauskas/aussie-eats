"""String id helpers (cuid-shaped, Prisma-compatible)."""

from __future__ import annotations

import secrets
import time


def new_id() -> str:
    # Compact unique id: timestamp prefix + entropy (not a full cuid2).
    stamp = format(int(time.time() * 1000), "x")
    return f"{stamp}{secrets.token_hex(8)}"
