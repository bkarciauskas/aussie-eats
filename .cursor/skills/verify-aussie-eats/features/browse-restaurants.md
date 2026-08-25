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
- Assert heading **Restaurants** and at most 10 `a.restaurant-row` cards.
- When the catalog has more than 10 matches, assert **Restaurant list pages** is present, open **Next**, and confirm page 2 has a new set of up-to-10 rows with no overlap.

## Gotchas

- After snapshot seed the list is paginated at 10 per page (`?page=`). Assert presence, not exact full-catalog counts.
- An empty catalog usually means `db:seed` was skipped. An unavailable API or backend error may mean Mongo is unreachable.
- Interactive map pins require `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; without it the page shows a map placeholder.
