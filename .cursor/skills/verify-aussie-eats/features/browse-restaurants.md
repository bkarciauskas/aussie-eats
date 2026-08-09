# Browse restaurants

Unauthenticated directory browse with optional city/cuisine/diet filters.

## Sub-features

- List of `a.restaurant-row` cards from FastAPI/Mongo.
- City / cuisine / open-now / diet filters on the restaurants page.
- Map pins reuse the same filtered list (no separate query).

## How to get to it (user POV)

Nav **Restaurants** → `/restaurants`, or open `/restaurants` directly.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs browse-restaurants
```

- Open `/restaurants`.
- Assert heading **Restaurants** and at least one `a.restaurant-row`.
- Optional manual: set City to **Sydney** and confirm filtered results.

## Gotchas

- After snapshot seed the list is large (hundreds of venues) with no pagination — assert presence, not exact counts.
- Empty catalog usually means `db:seed` was skipped or Mongo is unreachable.
