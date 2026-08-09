---
name: verify-aussie-eats
description: Drive the AussieEats Next.js storefront and admin the way a user does (browser + HTTP). Use when proving UI changes, smoke-checking local demos, or validating storefront/admin flows against a real running instance.
---

# Verify AussieEats

Project-local control skill for the AussieEats multi-vendor food delivery demo (Next.js App Router + FastAPI + MongoDB). Agents read this cold mid-task — follow it exactly.

## Surface

Primary: **web UI** at `http://127.0.0.1:$PORT` (default verify port **3010**).

Also required: **FastAPI** at `http://127.0.0.1:$API_PORT` (default **8000**), health `GET /health` → `{"status":"ok"}`. Demo auth is iron-session (cookie) holding a FastAPI JWT; catalog/orders live in Mongo (often hundreds of venues from `catalog_snapshot.json` after `db:seed`).

## Launch

Prefer an **isolated** verify instance. Do **not** drive a shared `npm run dev` on `:3000` unless the user explicitly says to — that session may be theirs.

```bash
# From repo root. Writes pid/port under the skill's .run/ dir.
# Starts FastAPI (if needed) then Next.js.
.cursor/skills/verify-aussie-eats/helpers/launch.sh
```

- Under the hood: uvicorn on `API_PORT` (reuses a healthy existing listener), then `PORT=$PORT npm run dev` with `API_BASE_URL` pointed at that API.
- Ready when `doctor.sh` exits 0 (API `/health` ok **and** home HTML contains `AussieEats` + `restaurant-search-hero`).
- Defaults: `PORT=3010`, `API_PORT=8000`. Override: `PORT=3011 API_PORT=8001 .cursor/skills/verify-aussie-eats/helpers/launch.sh`
- Prerequisites (once per checkout): root `.env` + `backend/.env` (`cp` from each `.env.example` if missing), `MONGODB_URI` reachable, `npm install`, `cd backend && python3 -m pip install -r requirements.txt` (or use `backend/.venv`), `npm run db:seed`.
- Teardown: `.cursor/skills/verify-aussie-eats/helpers/cleanup.sh` (kills **only** pids this skill recorded — Next always; FastAPI only if launch started it).

Mongo is shared with any other local instance using the same `MONGODB_URI` / `MONGODB_DB`. Prefer **read-only** proofs (browse/search) on a shared DB; for checkout/admin writes, accept mutating the demo DB or use a dedicated Atlas/local database via env.

## Doctor

```bash
.cursor/skills/verify-aussie-eats/helpers/doctor.sh
```

Checks: FastAPI `GET /health` succeeds, `.run/port` exists (or default), Next home body includes `AussieEats` + hero search id, and (when `.run/pid` exists) that pid still owns the Next port. **Exit non-zero if the API is down** — even when Next still serves HTML. Exit 0 = safe to drive.

## Drive

Harness: **Playwright Chromium** via `helpers/drive.mjs` (installs `playwright` into the skill-local `.tools/` on first use; browsers land in the user Playwright cache).

```bash
# Prove one mapped feature (name matches features/*.md stem)
.cursor/skills/verify-aussie-eats/helpers/drive.mjs home-hero-search
```

Stable handles (prefer these):

| Control | Selector / route |
| --- | --- |
| Brand home | `a[aria-label="AussieEats home"]` |
| Hero search input | `#restaurant-search-hero` (wait until not `disabled` — LocationProvider hydration) |
| Hero Find | `form.hero-search button[type="submit"]` |
| Hero suggestions listbox | `#restaurant-search-hero-suggestions` (`role="listbox"`) |
| Header search | `#restaurant-search-header` |
| Restaurants nav | `nav[aria-label="Primary"] a[href="/restaurants"]` |
| Restaurant card link | `a.restaurant-row` |
| City pin (home) | button exact name `Melbourne` (etc.) → link `Browse Melbourne restaurants` |
| Customer login | `/login` → `input[name="email"]`, `input[name="password"]`, button `Sign in` (`demo@aussieeats.local` / `demo1234`) |
| Admin login | `/admin/login` → same fields; `admin@aussieeats.local` / `admin1234` |
| Add to cart | restaurant menu → button text `Add` |
| Checkout | `/cart` → Checkout → `/checkout` → select Card → card fields → `Pay & place order` |
| Admin order status | `/admin/orders` → `→ Preparing` (etc.) on pending rows |
| Admin menu edit | `/admin/restaurants` → Menu → Edit → Save (`dialog[name="Edit menu item"]`) |

Feature recipes live in `features/`. Pick the file that matches the change; do not invent a shorter path that skips user-visible steps listed there. Seed landmark: **Harbour Burger Co** (`harbour-burger-co`) is **Sydney**, not Melbourne.

## Evidence

Directory: `.cursor/skills/verify-aussie-eats/evidence/<run-id>/`

Each proof must include:

1. **Action** — screenshot or HTML dump of the control being used (e.g. hero search filled).
2. **Result** — screenshot/HTML of the resulting state (e.g. `/restaurants?q=burger` listing Harbour Burger Co).
3. **`proof.json`** — `{ feature, baseUrl, steps[], passed, at }` with observable assertions (URL, visible text).

Standards: real user path only (no internal setters / test-only endpoints). Capture action **and** resulting state. Verify side effects when the feature has them (orders row, cart badge, admin status). Mocks only at true production boundaries (food data is Mongo via FastAPI — not mocked in-app).

Evidence **survives** cleanup. Do not commit screenshots (`evidence/` is gitignored).

## Cleanup

```bash
.cursor/skills/verify-aussie-eats/helpers/cleanup.sh
```

Stops the Next instance started by `launch.sh` (pid file). Stops FastAPI only when launch recorded `api_started`. Never `killall node` / `killall uvicorn` / never kill by process name. Leaves `evidence/` intact. Removes `.run` tracking files after a clean stop.

## Helpers

All under `.cursor/skills/verify-aussie-eats/helpers/` and executable:

| Script | Purpose |
| --- | --- |
| `launch.sh` | Start FastAPI (if needed) + isolated Next; record pids/ports |
| `doctor.sh` | Read-only health check (API `/health` + Next home) |
| `drive.mjs` | Playwright driver for a feature stem |
| `cleanup.sh` | Tear down launch.sh-owned processes only |

## Feature map

See `features/README.md`. Maintain with `/maintain-verification-skill` as routes change.
