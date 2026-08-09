# Wallet checkout

Place a demo order with Apple Pay while confirming both wallet options are available.

## Sub-features

- Checkout offers **Apple Pay** and **Google Pay**.
- Wallet selection hides card fields and changes the submit label to **Pay & place order**.
- Order detail records the selected wallet and shows **Paid (demo)**.

## How to get to it (user POV)

Sign in → Harbour Burger Co → **Add** → **Cart** → **Checkout** → **Apple Pay** → **Pay & place order**.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs wallet-checkout
```

- Confirm both wallet radio options, select Apple Pay, and assert card fields stay hidden.
- Place the order and assert `/orders/:id`, pending status, and **Payment: Apple Pay**.

## Gotchas

- Wallets are mocked demo methods; no real charge or provider handoff occurs.
- Checkout defaults to **Pay on delivery**; select a wallet explicitly.
- Card fields render only when **Card** is selected.
- Mutates the shared demo Mongo database.
