# Troubleshooting

Quick fixes for issues that have already bitten this codebase. Verify against current code if behavior diverges.

## Setup

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Empty restaurant list after reset | Catalog wiped | `npm run db:seed` (restores `catalog_snapshot.json`) |
| `db:import-places` throws missing key | No Places key in `.env` / `backend/.env` | Set `GOOGLE_PLACES_API_KEY` (or Maps key fallback); enable legacy Places API |
| Import fails with REQUEST_DENIED | Wrong API product or key restrictions | Use legacy Places API; avoid HTTP-referrer restriction on the server key |
| Import cannot reach Mongo | Missing `MONGODB_URI` | Set Atlas/local URI in `backend/.env` (see `backend/.env.example`) |
| Maps blank on `/restaurants` | No browser Maps key | Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; list/distance still work without it |

## City / search

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Melbourne (or other city) shows Sydney venues | City filter not applied, or comparing id to label | Ensure URL has `city=melbourne` (or label). Matching must use `matchesRestaurantCity` — DB stores labels. |
| Typing “Melbourne” in search does nothing useful | Older code treated city names as text `q` | Current `resolveRestaurantQuery` promotes city-name `q` to `city` and clears `q`. |
| City dropdown / pin dropped on first Find click | Search submitted before location hydration | Search forms disable submit until `hydrated` from `LocationProvider`. |
| Map pins disagree with the list | Pins not driven by filtered explorer data | Pins must use the same filtered restaurant array as the cards. |

## Cart / checkout / money

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Cart shows cents as dollars (or ~100× too small) | `unitPriceCents` fed dollars | Pass `item.priceCents` unchanged into the cart; format only at display via `formatAUD`. |
| Line total ignores quantity | Subtotal summed units only | Use `cartSubtotalCents` / `unitPriceCents * quantity`. |
| Checkout total ≠ cart total | Expected: server re-prices from DB | If wrong after refresh, check admin menu `priceCents` and that place-order uses DB prices. |
| Cannot add from a second restaurant | Single-vendor cart | Clear cart first (by design). |
| Invalid quantity errors | Qty outside 1–99 | `MAX_LINE_QUANTITY` is 99; both UI and `placeOrderAction` enforce it. |
| Guest checkout rejected with “account already exists” | Email belongs to a real (non-guest) user | Log in with that email, or use a different guest email. |
| Cannot log in after guest checkout | Guest users have no usable password | Sign up with the same email to upgrade the guest row in place, or continue as guest at checkout. |
| Guest orders missing after new signup on another email | Signup only preserves orders when the email matches the guest | Reuse the guest email on signup so `userId` is upgraded, not replaced. |

## Open now / ETA / orders

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| “Open now” wrong for a city | Missing `openingHoursJson` or wrong city label for TZ | Hours JSON from Places; TZ keyed by city label in `opening-hours.ts`. Fallback is `isOpen`. |
| No browse ETA label | No origin and no city pin | Set demo city or pass `lat`/`lng` on `/restaurants`. |
| Order timeline empty / stuck | Missing `statusHistoryJson` | New orders seed history on create; admin transitions append. `FORCE_SEED_ORDERS=1 npm run db:seed` rebuilds sample orders. |
| Live status on `/orders/[id]` never moves | Admin never advanced the order, or poll stopped | Advance status in `/admin`. Client polls every 3s until `delivered`/`cancelled` (`ORDER_STATUS_POLL_MS`). Reload if the tab was backgrounded for a long time. |
| No courier ETA banner on order detail | No resolvable origin | Set a demo city pin, or use a delivery suburb/state that maps to `DEMO_CITIES`. |
| `/restaurants` slow with full catalog | Missing Mongo indexes or filtering only in Next | Restart FastAPI so `ensure_indexes()` runs. City/cuisine/q/diet should hit `GET /restaurants` query params, not a full client-side catalog filter. |
| Typeahead empty on Atlas | Search index not ready | `ensure_search_indexes()` creates `restaurants_autocomplete` when supported. Until `queryable`, suggest uses the scan fallback (still works, may feel slower). |

## Dev / verify

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Shared `:3000` session polluted by agent verify | Verify skill defaulted to shared server | Use `.cursor/skills/verify-aussie-eats/helpers/launch.sh` (default port **3010**). |
| Doctor fails on IPv6 listen | Probe used wrong address family | Use the skill’s `doctor.sh` (fixed to probe the bound host correctly). |
| Unit tests | — | `npm test` |

## Useful resets

```bash
# Users + orders; keep restaurant catalog
npm run db:seed

# Drop restaurants/categories/menu_items, then seed (catalog empty → snapshot restore)
# (There is no npm run db:reset in this repo — clear those collections in Mongo, then:)
npm run db:seed

# Clear browser demo state
# localStorage: aussieeats_cart_v1, aussieeats_location_v1
```
