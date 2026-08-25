"""Page window over an already-filtered restaurant list."""

from __future__ import annotations

from typing import Sequence, TypeVar

T = TypeVar("T")

RESTAURANT_LIST_PAGE_SIZE = 10


def page_window(
    items: Sequence[T],
    page: int,
    page_size: int,
) -> tuple[list[T], int, int, int]:
    """Slice `items` into a clamped page window.

    Returns (page_items, page, page_size, total) where total is len(items)
    before the slice, and page/page_size are clamped.
    """
    total = len(items)
    size = max(1, min(int(page_size), RESTAURANT_LIST_PAGE_SIZE))
    current = max(1, int(page))
    if total > 0:
        last_page = (total + size - 1) // size
        if current > last_page:
            current = last_page
    else:
        current = 1
    start = (current - 1) * size
    return list(items[start : start + size]), current, size, total
