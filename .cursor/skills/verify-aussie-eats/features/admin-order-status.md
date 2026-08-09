# Admin order status

Advance an order from **pending** → **preparing** in the admin Orders table.

## Sub-features

- Status pills with `data-status`.
- Allowed transition buttons (`→ Preparing`, etc.).
- Server Action + FastAPI PATCH; history appends.

## How to get to it (user POV)

`/admin/login` → **Orders** → pending row → **→ Preparing**.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-order-status
```

- Login as admin, then choose **Orders** in the admin nav.
- Click **→ Preparing** on a pending row; assert pending count decreases and preparing increases.

## Gotchas

- There is **no** status filter on the orders page. Wait on DOM status counts after revalidate.
- Dashboard order pills are read-only; use `/admin/orders` for transition buttons.
- If no pending rows exist, run `place-order` first (or seed with `FORCE_SEED_ORDERS=1`).
- Mutates shared demo MongoDB.
