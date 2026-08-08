# Catalog ingest (Google Places → Mongo)

One-shot script that fills the restaurant catalog with real venues. **Browse never calls Places at runtime.**

The Mongo path is `backend/app/import_places.py` (`npm run db:import-places`). The legacy Prisma/SQLite script remains at `scripts/import-places.ts` (`npm run db:import-places:sqlite`).

## When to use

| Situation | Action |
| --- | --- |
| Fresh DB, want handwritten demo (~23 venues) | `npm run db:seed:mongo` only |
| Want ~100 venues per capital (~600 total) | `npm run db:import-places` after Mongo is reachable |
| Refresh venue metadata / photos | Re-run import (upserts by `placeId`) |
| Wipe handwritten + imported catalog | Drop/clear the `restaurants` / `categories` / `menu_items` collections, then seed and optionally import |

`db:seed:mongo` upserts users and seeds sample orders/reviews **only when they are missing**. It bootstraps handwritten restaurants **only if the catalog is empty** — it does not delete Places-imported rows. Use `FORCE_SEED_ORDERS=1 npm run db:seed:mongo` to wipe and rebuild sample orders/reviews.

## Prerequisites

1. Env vars (repo-root `.env` and/or `backend/.env`):
   - `MONGODB_URI` / `MONGODB_DB` for Atlas or local Mongo
   - Prefer `GOOGLE_PLACES_API_KEY` (server; not HTTP-referrer restricted)
   - Falls back to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Enable the **legacy Places API** on the Google Cloud project (Nearby Search, Text Search, Details, Photo).
3. Restaurant indexes present (`placeId` unique sparse). `import_places` calls `ensure_indexes()` on start.

## Commands

```bash
# All demo cities, up to 100 venues each → Mongo
npm run db:import-places

# One city / smaller batch
npm run db:import-places -- --city=melbourne --per-city=20

# Equivalent from backend/
cd backend && python3 -m app.import_places --city=sydney --per-city=10

# Legacy Prisma → SQLite path (unchanged)
npm run db:import-places:sqlite
```

Args: `--city=` id or label, `--per-city=` positive int.

## What the script does

1. For each city in `DEMO_CITIES` (or the filtered city), collects place IDs via Nearby / Text Search across cuisine queries.
2. Fetches Place Details; upserts the `restaurants` collection by unique `placeId`.
3. Downloads photos to `public/images/imported/` (skipped if already cached).
4. Attaches a **cuisine-templated menu** from `backend/app/domain/cuisine_menu_templates.py` (+ JSON export of `prisma/cuisine-menu-templates.ts`). Places has no menus. Menus are created on **insert only** — re-import updates venue fields, not menu items. Dietary / allergen tags on those menus are **demo approximations** from cuisine templates; do not treat them as medical-grade.

Venue fields updated on re-import include name, description, image, cuisine tags, city/suburb, lat/lng, rating, rating count, opening hours JSON, phone, `isOpen`. Dietary tags on existing menus are not refreshed by re-import; run `npm run db:seed:mongo` to backfill empty tags.

## Constraints and pitfalls

- Expect several minutes and Places quota usage; the script sleeps between requests.
- Photos under `public/images/imported/` are local assets; keep them out of accidental wipe workflows if you care about re-download cost (see `.gitignore`).
- Delivery fee / min order are derived heuristically from rating at create time (`delivery_fees` in the script), not from Google.
- City on the row is the demo **label** (e.g. `Sydney`) so storefront filters match `matchesRestaurantCity`.
- Maps JS key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) is optional for distance sort / “use my location”; it is separate from ingest.

## Refresh cuisine templates

If you edit `prisma/cuisine-menu-templates.ts`, re-export JSON for the Python ingest:

```bash
npm run db:export-cuisine-templates
```

## Verify after import

```bash
npm run db:seed:mongo   # safe: keeps catalog and existing orders/reviews
npm run dev
```

Check `/restaurants?city=melbourne` shows Melbourne venues with ratings/hours when present.
