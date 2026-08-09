# Place order

Add a menu item, check out with a mocked card payment, and land on the order detail.

## Sub-features

- Client cart (`aussieeats_cart_v1`) then Server Action → FastAPI reprice.
- Checkout payment methods; Card enables **Pay & place order**.
- Order detail shows `data-status="pending"` and card summary.

## How to get to it (user POV)

`/restaurants/harbour-burger-co` → **Add** → **Cart** → **Checkout**.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs place-order
```

- Login with `next=/restaurants/harbour-burger-co`.
- **Add** first item → `/cart` → Checkout.
- Select **Card**, fill `4242…` / name / `12/30` / `123` → **Pay & place order**.
- Assert `/orders/:id`, `[data-status="pending"]`, and Visa 4242 copy.

## Gotchas

- Default payment method is Pay on delivery (**Place order**); must select **Card** for the Pay & place order label.
- Mutates shared Mongo — prefer a dedicated DB when parallelism matters.
- Harbour slug must exist (seed/snapshot).
