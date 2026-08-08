"""Export Mongo restaurant catalog → backend/app/catalog_snapshot.json.

Usage (from backend/):
  python3 -m app.export_catalog

Or from repo root:
  npm run db:export-catalog
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Optional

from app.catalog_snapshot import SNAPSHOT_PATH, export_catalog_from_db
from app.db import close_db, connect_db, ensure_indexes


async def run_export(*, path: Path = SNAPSHOT_PATH) -> dict[str, int]:
    db = await connect_db()
    try:
        await ensure_indexes()
        counts = await export_catalog_from_db(db, path=path)
        print(
            f"Exported catalog snapshot → {path.relative_to(path.parents[1]) if path.is_absolute() else path}"
        )
        print(
            f"  restaurants={counts['restaurants']} "
            f"categories={counts['categories']} "
            f"menu_items={counts['menu_items']}"
        )
        return counts
    finally:
        await close_db()


def main(argv: Optional[list[str]] = None) -> None:
    _ = argv  # reserved for future --out= flags
    try:
        asyncio.run(run_export())
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
