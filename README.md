# AussieEats

Local-only multi-vendor food delivery demo (customer storefront + `/admin`) built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, and **FastAPI + MongoDB**.

## Requirements

- Node.js **20.x** (22 also works)
- npm
- Python 3 + `backend/requirements.txt`
- MongoDB (local or Atlas)
- Optional: Google Places API key for catalog ingest

## Quick start

```bash
cp .env.example .env
cp backend/.env.example backend/.env
npm install
cd backend && python3 -m pip install -r requirements.txt && cd ..
npm run db:seed
# terminal 1
cd backend && python3 -m uvicorn app.main:app --reload --port 8000
# terminal 2
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`db:seed` upserts demo users. If the restaurant catalog is empty it loads the handwritten fallback (~23 venues). Sample orders and customer reviews are written once into Mongo and left alone on later seed runs (use `FORCE_SEED_ORDERS=1` to rebuild them). It does **not** wipe Places-imported restaurants.

### Large catalog (Google Places)

One-shot ingest into Mongo (~100 restaurants per major city, ~600 total).

```bash
# Enable the (legacy) Places API on the Google Cloud project, then:
npm run db:import-places
# optional: -- --per-city=100 -- --city=sydney
# equivalent: cd backend && python3 -m app.import_places
```

Uses Nearby Search / Text Search / Details / Photo. Expect several minutes and Places quota. Re-runs upsert by `placeId` and skip cached photos under `public/images/imported/`. Menus are cuisine-templated (Places has no menus). Venue details are sourced from Google Places; menus are demo-generated.

### Environment

| Variable | Example | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | 32+ char string | iron-session cookie encryption |
| `API_BASE_URL` | `http://127.0.0.1:8000` | FastAPI base URL for login/signup JWT bridge |
| `MONGODB_URI` / `MONGODB_DB` | Atlas or local URI | FastAPI + `db:seed` / `db:import-places` |
| `JWT_SECRET` | 32+ char string | FastAPI JWT signing |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | browser key | Maps JS + Places autocomplete on `/restaurants` |
| `GOOGLE_PLACES_API_KEY` | server key | `db:import-places` (falls back to the Maps key) |

### Demo logins

| Role | Email | Password |
| --- | --- | --- |
| Customer | `demo@aussieeats.local` | `demo1234` |
| Admin | `admin@aussieeats.local` | `admin1234` |

### Reset

```bash
npm run db:seed                        # users; orders/reviews if missing; keeps catalog
FORCE_SEED_ORDERS=1 npm run db:seed    # rebuild sample orders + reviews
npm run db:import-places               # pull/refresh real venues into Mongo
```

## Presenter script (≈3 minutes)

1. Open `/` — brand hero **AussieEats**, use the hero **Find** search (e.g. `burger` or `Fitzroy`), or pick a demo city below then search again (city scopes results).
2. On `/restaurants`, refine with **City** / **Cuisine** / **Open now**, or use the header search from any storefront page.
3. Open a restaurant → note rating count, hours, ETA → **Add** items → **Cart** → **Checkout**.
4. Log in as `demo@aussieeats.local` / `demo1234` if prompted → confirm AU address → choose Pay on delivery, Card, Apple Pay, or Google Pay (all mocked) → place the order.
5. Confirm the order under **Orders** and open detail for the status timeline.
6. Open `/admin/login` → `admin@aussieeats.local` / `admin1234`.
7. Dashboard shows counts; **Orders** → advance status (`pending` → `preparing` → …).
8. **Restaurants** → pick one → **Menu** → edit an item price → save → verify on the storefront menu.

## Smoke checklist

- [ ] `npm install && npm run db:seed && npm run dev` (with FastAPI up) starts cleanly
- [ ] Unauthenticated browse of `/restaurants` and a menu works
- [ ] Home hero search and header search both land on `/restaurants?q=…` (with `city` when a demo pin is set)
- [ ] Demo city picker sets location for the session (localStorage); city filter on `/restaurants` works
- [ ] Seed / import includes restaurants across Sydney, Melbourne, Brisbane, Perth, Adelaide, and Hobart
- [ ] Open now filter, rating counts, hours, and delivery ETA appear when data/location allow
- [ ] Cart works without login; checkout requires login
- [ ] Placing an order with any mocked payment method creates status `pending`, clears cart, and shows the payment method in `/orders`
- [ ] AUD formatting (`$x.xx`) and AU address fields (suburb / NSW / postcode / +61) appear
- [ ] Admin login blocks non-admins from `/admin`
- [ ] Admin can edit a menu price and change an order’s status
- [ ] `db:seed` does not delete an imported Places catalog

## Architecture notes

- **Persistence:** MongoDB via FastAPI (`backend/`) — Atlas or local
- **Catalog ingest:** `backend/app/import_places.py` → upsert by `placeId`; photos in `public/images/imported/`
- **Auth:** FastAPI JWT via `src/lib/api.ts`; iron-session stores the Bearer token (`CUSTOMER` / `ADMIN` roles)
- **Cart:** client React context + `localStorage`; server writes orders on checkout
- **Money:** integer cents (`unitPriceCents` / `priceCents`); display with `formatAUD` (`en-AU`)
- **Location:** demo city pins in `localStorage`; `/restaurants` filters by city label via `matchesRestaurantCity`
- **Images:** local assets under `public/images/`

Deeper developer docs (browse/location, cart money, Places runbook, Cloud Agents, troubleshooting):

- [docs/README.md](./docs/README.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/catalog-ingest.md](./docs/catalog-ingest.md)
- [docs/cloud-agents.md](./docs/cloud-agents.md) — secrets (`MONGODB_URI`, `JWT_SECRET`) and Network Access for `*.mongodb.net`
- [docs/troubleshooting.md](./docs/troubleshooting.md)

## Useful scripts

| Script | Action |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run db:seed` | Upsert demo users; seed orders/reviews if missing; bootstrap catalog if empty |
| `npm run db:import-places` | One-shot Google Places → Mongo ingest |
| `npm test` | Unit tests (`src/**/*.test.ts` via tsx) |
| `npm run test:backend` | FastAPI pytest suite (`backend/tests`) |
| `npm run lint` | ESLint |

### Backend pytest (APJ-20)

```bash
cd backend && python3 -m pytest
# or: npm run test:backend
```

Covers auth, checkout price recompute, min-order rejection, order status transitions, favourites, and reviews against an in-memory fake Mongo.
