# Live order status

Customer `/orders/[id]` soft-polls status and shows a mock courier ETA that shrinks as the order advances.

## Sub-features

- Timeline steps: pending → preparing → out for delivery → delivered
- `data-live-order-status` / `data-live-polling` / `data-courier-eta` markers
- Admin status advances on `/admin/orders` appear on the open customer tab within a few seconds

## How to get to it (user POV)

Place an order (or open an existing pending order) → leave `/orders/[id]` open → in another session advance status in admin → watch the customer timeline/ETA update without a full reload.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs live-order-status
```

- Log in as customer, open a pending order detail page.
- Assert `data-live-polling="true"` and a courier ETA banner.
- Advance the same order to preparing via admin (or API).
- Wait up to ~5s; assert customer `data-live-order-status` / `data-status` becomes `preparing`.

## Gotchas

- Polling stops once status is `delivered` or `cancelled`.
- ETA needs an origin: selected demo city pin, delivery suburb/state, or restaurant city.
- Mutates shared demo DB if you advance status.
