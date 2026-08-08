# Admin menu edit

## What

Sign in as admin, open a restaurant menu, edit an item price, and confirm it persists.

## Reach

`/admin/login` → `/admin/restaurants` → **Menu** on Harbour Burger Co.

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-menu-edit
```

Manual equivalent:

1. Open `/admin/login`
2. Submit `admin@aussieeats.local` / `admin1234`
3. Open **Restaurants** → Harbour Burger Co → **Menu**
4. Click **Edit** on the first item
5. Bump price by $0.50 → **Save**
6. Reload and confirm the new price is shown

## Proof

- Edit dialog closes after save
- Reloaded menu list shows the updated `$*` price on the first item

Mutates shared demo DB (price bump of $0.50 on first Harbour Burger item).
