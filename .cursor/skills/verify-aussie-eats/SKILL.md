---
name: verify-aussie-eats
description: Drive the AussieEats Next.js storefront and admin the way a user does (browser + HTTP). Use when proving UI changes, smoke-checking local demos, or validating storefront/admin flows against a real running instance.
---

# Verify AussieEats

Project-local control skill for the AussieEats multi-vendor food delivery demo (Next.js App Router + Prisma/SQLite). Agents read this cold mid-task — follow it exactly.

## Surface

Primary: **web UI** at `http://127.0.0.1:$PORT` (default verify port **3010**).

Also present (secondary): JSON-ish RSC HTML over HTTP; SQLite at `prisma/dev.db`; demo auth cookies via iron-session.

## Launch

Prefer an **isolated** verify instance. Do **not** drive a shared `npm run dev` on `:3000` unless the user explicitly says to — that session may be theirs.

```bash
# From repo root. Writes pid/port under the skill's .run/ dir.
.cursor/skills/verify-aussie-eats/helpers/launch.sh
```

- Command under the hood: `PORT=$PORT npm run dev` (Next.js).
- Ready when `doctor.sh` exits 0 (home HTML contains `AussieEats` and `restaurant-search-hero`).
- Default `PORT=3010`. Override: `PORT=3011 .cursor/skills/verify-aussie-eats/helpers/launch.sh`
- Prerequisites (once per checkout): `.env` present (`cp .env.example .env` if missing), `npm install`, `npx prisma migrate dev`, `npm run db:seed`.
- Teardown: `.cursor/skills/verify-aussie-eats/helpers/cleanup.sh` (kills **only** the pid recorded at launch).

SQLite is shared with any other local instance pointing at `prisma/dev.db`. Prefer **read-only** proofs (browse/search) on a shared DB; for checkout/admin writes, use an isolated DB via `DATABASE_URL="file:./verify.db"` only when you also migrate+seed that file, or accept mutating the demo DB.

## Doctor

```bash
.cursor/skills/verify-aussie-eats/helpers/doctor.sh
```

Checks: `.run/port` exists, TCP responds, home body includes `AussieEats` + hero search id, and (when `.run/pid` exists) that pid still owns the port. Exit 0 = safe to drive.

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
| Hero search input | `#restaurant-search-hero` |
| Hero Find | `form.hero-search button[type="submit"]` |
| Header search | `#restaurant-search-header` |
| Restaurants nav | `nav[aria-label="Primary"] a[href="/restaurants"]` |
| Customer login | `/login` → `input[name="email"]`, `input[name="password"]`, button `Sign in` |
| Admin login | `/admin/login` → same fields; demo `admin@aussieeats.local` / `admin1234` |
| Add to cart | restaurant menu → button text `Add` |
| Checkout | `/cart` → Checkout → `/checkout` → `Place order` |

Feature recipes live in `features/`. Pick the file that matches the change; do not invent a shorter path that skips user-visible steps listed there.

## Evidence

Directory: `.cursor/skills/verify-aussie-eats/evidence/<run-id>/`

Each proof must include:

1. **Action** — screenshot or HTML dump of the control being used (e.g. hero search filled).
2. **Result** — screenshot/HTML of the resulting state (e.g. `/restaurants?q=burger` listing Harbour Burger Co).
3. **`proof.json`** — `{ feature, baseUrl, steps[], passed, at }` with observable assertions (URL, visible text).

Standards: real user path only (no internal setters / test-only endpoints). Capture action **and** resulting state. Verify side effects when the feature has them (orders row, cart badge, admin status). Mocks only at true production boundaries (this app has none for food data — it is local SQLite).

Evidence **survives** cleanup. Do not commit screenshots (`evidence/` is gitignored).

## Cleanup

```bash
.cursor/skills/verify-aussie-eats/helpers/cleanup.sh
```

Stops the instance started by `launch.sh` (pid file). Never `killall node` / never kill by process name. Leaves `evidence/` intact. Removes `.run/pid` (and port file) after a clean stop.

## Helpers

All under `.cursor/skills/verify-aussie-eats/helpers/` and executable:

| Script | Purpose |
| --- | --- |
| `launch.sh` | Start isolated Next dev server; record pid/port |
| `doctor.sh` | Read-only health check |
| `drive.mjs` | Playwright driver for a feature stem |
| `cleanup.sh` | Tear down launch.sh instance only |

## Feature map

See `features/README.md`. Maintain with `/maintain-verification-skill` as routes change.
