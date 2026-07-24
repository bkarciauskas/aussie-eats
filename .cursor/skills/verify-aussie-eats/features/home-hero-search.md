# Home hero search

## What

From the landing hero, search restaurants/suburbs/cuisines and land on a filtered restaurants list.

## Reach

1. Open `/`
2. Wait until `#restaurant-search-hero` is enabled (location provider hydrated)

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs home-hero-search
```

Manual equivalent:

1. Fill `#restaurant-search-hero` with `burger`
2. Click `form.hero-search button[type="submit"]` (label **Find**)
3. Wait for navigation to `/restaurants` with `q=burger` (city may also appear if a demo pin is set)

## Proof

- URL matches `/restaurants` and query includes `q=burger` (case-insensitive)
- Page shows heading **Restaurants**
- At least one result includes **Harbour Burger Co** (seed data)
- Evidence dir has before/after screenshots + `proof.json` with `passed: true`
