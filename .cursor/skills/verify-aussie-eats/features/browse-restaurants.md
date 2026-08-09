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

- Open `/`, then choose **Restaurants** in the primary nav.
- Assert heading **Restaurants** and at least one `a.restaurant-row`.
- Optional manual: set City to **Sydney** and confirm filtered results.

## Gotchas

- After snapshot seed the list is large (hundreds of venues) with no pagination. Assert presence, not exact counts.
- Empty catalog usually means `db:seed` was skipped or Mongo is unreachable.
- Interactive map pins require `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; without it the page shows a map placeholder.
