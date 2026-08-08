"""Review rating helpers (ported from src/lib/reviews.ts)."""

from __future__ import annotations

from typing import Any, Optional

MIN_REVIEW_RATING = 1
MAX_REVIEW_RATING = 5
MAX_REVIEW_COMMENT_LENGTH = 500


def parse_review_rating(value: Any) -> Optional[int]:
    import math

    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(n):
        return None
    rating = int(n)
    if rating < MIN_REVIEW_RATING or rating > MAX_REVIEW_RATING:
        return None
    return rating


def normalize_review_comment(value: Any) -> str:
    raw = value if isinstance(value, str) else ""
    return raw.strip()[:MAX_REVIEW_COMMENT_LENGTH]


def blend_restaurant_rating(
    current_rating: float,
    current_count: int,
    submitted_rating: int,
) -> tuple[float, int]:
    safe_count = max(0, int(current_count))
    safe_current = current_rating if isinstance(current_rating, (int, float)) else 0.0
    user_rating_count = safe_count + 1
    rating = (safe_current * safe_count + submitted_rating) / user_rating_count
    return rating, user_rating_count
