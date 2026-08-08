# Admin order status

## What

Sign in as admin and advance an order from **pending** → **preparing**.

## Reach

`/admin/login` → `/admin/orders`.

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-order-status
```

Manual equivalent:

1. Open `/admin/login`
2. Submit `admin@aussieeats.local` / `admin1234`
3. Open **Orders**
4. On a row with status **Pending**, click **→ Preparing**
5. Confirm the status pill shows **Preparing**

## Proof

- At least one order row shows `data-status="preparing"` after the click
- Invalid skips (e.g. pending → delivered) stay blocked by the API (covered by backend pytest)

Mutates shared demo DB — prefer placing a fresh order first when the queue has no pending rows.
