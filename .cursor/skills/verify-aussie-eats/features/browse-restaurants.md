# Browse restaurants

## What

Unauthenticated browse of the restaurant directory with optional city/cuisine filters.

## Reach

Nav **Restaurants** → `/restaurants`, or open `/restaurants` directly.

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs browse-restaurants
```

Manual equivalent:

1. Open `/restaurants`
2. Confirm list renders (not the empty-state panel)
3. Optional: set City filter to `Sydney` via the filters form and submit

## Proof

- Heading **Restaurants** visible
- At least one `a.restaurant-row` present
- Seed restaurants from multiple cities appear when no city filter is set (e.g. Sydney + Melbourne names in HTML)
