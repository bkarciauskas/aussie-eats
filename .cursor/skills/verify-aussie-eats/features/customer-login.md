# Customer login

Sign in as the demo customer and reach an authenticated storefront session.

## Sub-features

- `/login` form with email/password.
- iron-session cookie holding FastAPI JWT.
- Header swaps **Log in** → **Log out**.

## How to get to it (user POV)

Header **Log in** → `/login`, or open `/login` (optional `?next=`).

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs customer-login
```

- Submit `demo@aussieeats.local` / `demo1234` via **Sign in**.
- Assert **Log out** is visible in the header.

## Gotchas

- Storefront and `/admin` sessions are separate cookies/routes.
- Requires FastAPI + seeded demo user; Next alone is not enough.
