# Catalog ingest (snapshot + Google Places)

Browse never calls Places at runtime. The storefront reads Mongo only.

| Path | Command | When |
| --- | --- | --- |
| **Fast default** | `npm run db:seed` | Empty catalog → restores committed `catalog_snapshot.json` (hundreds of venues) in seconds |
| Handwritten fallback | (automatic if snapshot missing) | ~23 venues from `seed_data.json` |
| Places refresh | `npm run db:import-places` | Rare: pull/update real venues from Google, then re-export snapshot |
| Export snapshot | `npm run db:export-catalog` | After a Places refresh, rewrite `backend/app/catalog_snapshot.json` |

## Seed / wipe behaviour

| Situation | Action |
| --- | --- |
| Fresh DB, want the full demo catalog | `npm run db:seed` only (uses the snapshot) |
| Refresh venue metadata / photos from Google | `npm run db:import-places`, then `npm run db:export-catalog` and commit the snapshot |
| Wipe handwritten + imported catalog | Drop/clear the `restaurants` / `categories` / `menu_items` collections, then `npm run db:seed` |

`db:seed` upserts users and seeds sample orders/reviews **only when they are missing**. It restores the snapshot (or handwritten fallback) **only if the catalog is empty** — it does not delete Places-imported rows. Use `FORCE_SEED_ORDERS=1 npm run db:seed` to wipe and rebuild sample orders/reviews.

Imported photos under `public/images/imported/` are gitignored. On snapshot restore, if an `/images/imported/…` file is missing locally, seed rewrites the venue image to cuisine stock art under `public/images/restaurants/`. Machines that already have the JPGs keep the real photos.

## Prerequisites (Places refresh only)

1. Env vars (repo-root `.env` and/or `backend/.env`):
   - `MONGODB_URI` / `MONGODB_DB` for Atlas or local Mongo
   - Prefer `GOOGLE_PLACES_API_KEY` (server; not HTTP-referrer restricted)
   - Falls back to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Enable the **legacy Places API** on the Google Cloud project (Nearby Search, Text Search, Details, Photo).
3. Restaurant indexes present (`placeId` unique sparse). `import_places` calls `ensure_indexes()` on start.

## Commands

```bash
# Empty Mongo → restore committed snapshot (no Google key)
npm run db:seed

# After Places refresh: write catalog_snapshot.json from Mongo
npm run db:export-catalog

# All demo cities, up to 100 venues each → Mongo (slow; quota)
npm run db:import-places

# One city / smaller batch
npm run db:import-places -- --city=melbourne --per-city=20

# Equivalent from backend/
cd backend && python3 -m app.import_places --city=sydney --per-city=10
```

Args for import: `--city=` id or label, `--per-city=` positive int.

## What Places import does

1. For each city in `DEMO_CITIES` (or the filtered city), collects place IDs via Nearby / Text Search across cuisine queries.
2. Fetches Place Details; upserts the `restaurants` collection by unique `placeId`.
3. Downloads photos to `public/images/imported/` (skipped if already cached).
4. Attaches a **cuisine-templated menu** from `backend/app/domain/cuisine_menu_templates.py` (menus in `cuisine_menu_templates.json`). Places has no menus. Menus are created on **insert only** — re-import updates venue fields, not menu items. Dietary / allergen tags on those menus are **demo approximations** from cuisine templates; do not treat them as medical-grade.

Venue fields updated on re-import include name, description, image, cuisine tags, city/suburb, lat/lng, rating, rating count, opening hours JSON, phone, `isOpen`. Dietary tags on existing menus are not refreshed by re-import; run `npm run db:seed` to backfill empty tags.

## Constraints and pitfalls

- Prefer the snapshot for setup. Places ingest takes several minutes and uses quota; the script sleeps between requests.
- Photos under `public/images/imported/` are local assets; keep them out of accidental wipe workflows if you care about re-download cost (see `.gitignore`).
- Delivery fee / min order are derived heuristically from rating at create time (`delivery_fees` in the script), not from Google.
- City on the row is the demo **label** (e.g. `Sydney`) so storefront filters match `matchesRestaurantCity`.
- Maps JS key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) is optional for distance sort / “use my location”; it is separate from ingest.

## Verify after seed or import

```bash
npm run db:seed   # safe: keeps catalog and existing orders/reviews
npm run dev
```

Check `/restaurants?city=melbourne` shows Melbourne venues with ratings/hours when present.
