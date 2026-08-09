# Admin login + dashboard

Sign in as admin and reach the dashboard with Admin nav.

## Sub-features

- `/admin/login` separate from storefront login.
- Dashboard counts from FastAPI `GET /admin/dashboard`.
- Admin nav: Dashboard, Restaurants, Orders.

## How to get to it (user POV)

Open `/admin/login` (or `/admin` when unauthenticated).

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-login
```

- Submit `admin@aussieeats.local` / `admin1234`.
- Assert URL `/admin`, Admin nav links to `/admin/orders` and `/admin/restaurants`, and Restaurants copy on the page.

## Gotchas

- Next and FastAPI both require the `ADMIN` role. Customer demo login will not unlock `/admin`.
