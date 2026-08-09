# Favourites

Signed-in customer saves a restaurant from browse, sees it on `/favourites` after reload, then cleans up.

## Sub-features

- Heart button on restaurant cards (`aria-pressed`, accessible Save/Remove labels).
- `/favourites` list for the signed-in user.
- Toggle persists in Mongo via FastAPI.

## How to get to it (user POV)

Sign in → `/restaurants` → heart a card → nav **Favourites**.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs favourites
```

- Login with `next=/restaurants`.
- Ensure the first card heart is unpressed, then activate its Save-to-favourites control.
- Open Favourites, reload, assert the name remains, then activate its Remove-from-favourites control to leave the demo account clean.

## Gotchas

- First card is non-deterministic in a large catalog. Capture the name before navigating away.
- Unauthenticated heart flows redirect to login.
