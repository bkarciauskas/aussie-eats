# Admin menu edit

Edit a Harbour Burger Co menu item price and confirm it persists after reload.

## Sub-features

- Admin restaurants list → **Menu** link.
- Edit dialog (`aria-label="Edit menu item"`) with `input[name="price"]` in dollars.
- Save writes cents to Mongo via FastAPI.

## How to get to it (user POV)

`/admin/login` → **Restaurants** → Harbour Burger Co **Menu** → **Edit** → **Save**.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-menu-edit
```

- Open Harbour Burger Co menu, bump first item price by $0.50, Save, reload.
- Assert first line shows the new `$x.xx` price.
- Restore the original price through the same edit dialog and assert the restore persists.

## Gotchas

- Dialog accessible name is **Edit menu item** (aria); visible heading may say **Edit item**.
- The driver restores the original price so scheduled runs do not accumulate changes in the shared demo database.
- Never pass dollars into client `unitPriceCents` elsewhere; admin form converts dollars → cents.
