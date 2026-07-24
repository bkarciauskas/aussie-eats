# Place order

## What

Add a menu item, check out with Pay on delivery, and see the order under **Orders**.

## Reach

`/restaurants` → a restaurant (e.g. Harbour Burger Co) → **Add** → **Cart** → **Checkout**.

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs place-order
```

Manual equivalent:

1. Open a restaurant menu (`/restaurants/harbour-burger-co`)
2. Click **Add** on an available item
3. Open `/cart` → proceed to `/checkout`
4. If prompted, log in as `demo@aussieeats.local` / `demo1234`
5. Confirm AU address fields → **Place order**
6. Open `/orders` and find the new order (status `pending`)

## Proof

- Cart cleared after place
- `/orders` lists the new order
- Order detail shows status pending / Pay on delivery
- **Side effect:** row exists in SQLite `Order` (or visible in admin Orders)

Mutates shared demo DB — prefer an isolated `DATABASE_URL` when parallelism matters.
