# Guest checkout

Place an order without logging in as `demo@aussieeats.local`. Checkout collects name + email + address, creates a guest session, and lands on the order detail.

## Sub-features

- Checkout form visible while anonymous (no "Log in to checkout" wall).
- Guest contact fields (`guestName`, `guestEmail`) plus existing address + mocked payments.
- FastAPI `POST /auth/guest` then `POST /orders` via the place-order Server Action.
- Orders list explains that full history needs an account.

## How to get to it (user POV)

`/restaurants/harbour-burger-co` → **Add** → **Cart** → **Checkout** (stay logged out).

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs guest-checkout
```

- Do **not** log in first.
- **Add** first item → `/cart` → Checkout.
- Fill `guestName` / `guestEmail`, keep the default address, select **Card**, and fill `4242…`, name, expiry, and CVC → **Pay & place order**.
- Assert `/orders/:id`, guest copy about account history, and `[data-status="pending"]`.

## Gotchas

- Using `demo@aussieeats.local` as the guest email fails (existing account) — use a unique guest email.
- Mutates shared Mongo (creates a guest user + order).
