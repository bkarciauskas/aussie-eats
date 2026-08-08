# Place order

## What

Add a menu item, check out with a mocked card payment, and see the order under **Orders**.

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
5. Confirm AU address fields → select **Card**
6. Enter card number `4242 4242 4242 4242`, any name, a valid `MM/YY` expiry, and a 3-digit CVC
7. Select **Pay & place order**
8. Open `/orders` and find the new order (status `pending`)

## Proof

- Cart cleared after place
- `/orders` lists the new order
- Order detail shows status pending / `Card · Visa ending 4242` / `Paid (demo)`
- **Side effect:** order exists in Mongo via FastAPI (visible under `/orders` or admin Orders)

Mutates shared demo Mongo — prefer a dedicated `MONGODB_URI` / `MONGODB_DB` when parallelism matters.
