# Restaurant map pins

## What

Map pins on `/restaurants` match the filtered restaurant list (including city filter), and detail-page maps use the restaurant’s real lat/lng.

## Reach

`/restaurants`, city filter, and `/restaurants/<slug>` location map.

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs restaurant-map-pins
```

Manual equivalent:

1. Open `/restaurants` with maps enabled
2. Confirm marker titles match listed restaurant names (same count)
3. Filter City to Melbourne → list and map both show only the three Melbourne venues
4. Open Harbour Burger Co detail → location map centers near Surry Hills, Sydney (`lat≈-33.88`, `lng≈151.21`)

## Proof

- Melbourne filter: list rows = 3 and map marker titles = those three names
- Detail map center uses restaurant `lat`/`lng` (not swapped)
