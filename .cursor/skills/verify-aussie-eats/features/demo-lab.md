# Demo lab

Toggle a storefront cart fault on, prove it on quantity 2, turn it off, and confirm `/admin` is still the restaurant ops portal.

## Sub-features

- `/demo-admin` lists registry scenarios. Flags persist in `aussieeats_demo_v1` in this browser only.
- `cart-subtotal-ignores-qty` makes cart and checkout subtotals skip quantity. Line items still show unit × qty.
- FastAPI still charges Mongo × quantity. Order confirmation disagrees with the buggy cart.
- Storefront banner while a scenario is on. Discreet **Demo lab** link in the customer header, not in `/admin`.

## How to get to it (user POV)

Storefront header **Demo lab**, or open `/demo-admin`.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs demo-lab
```

- Turn **Cart subtotal skips quantity** on.
- Sign in, add a Harbour Burger Co item, set quantity to 2.
- Assert cart `data-cart-subtotal` equals one unit, and the banner is visible.
- Turn the scenario off. Assert the same cart totals unit × 2 and the banner is gone.
- Turn it on again, open checkout (line cents ≠ subtotal), place a card order.
- Assert `data-order-subtotal` is unit × 2. Assert `/admin/login` still shows Admin sign in, not Demo lab.

## Gotchas

- Cart is `localStorage`. Toggling does not clear items.
- Harbour Burger Co must be open. **Add** is disabled outside opening hours.
- Mutates shared Mongo when the drive places an order.
- `/admin` is restaurant ops. Do not look for demo toggles there.
