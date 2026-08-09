# Home hero search

From the landing hero, search restaurants/suburbs/cuisines and land on a filtered restaurants list.

## Sub-features

- Hero input enables after LocationProvider hydration.
- Submit (Find or Enter) navigates to `/restaurants` with `q=…`.
- Optional city pin may also append `lat` / `lng` / `place` / `city`.

## How to get to it (user POV)

1. Open `/`.
2. Wait until `#restaurant-search-hero` is enabled.
3. Type a query and choose **Find** (or press Enter).

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs home-hero-search
```

- Fill `#restaurant-search-hero` with `burger`, submit.
- Assert URL includes `q=burger`, heading **Restaurants**, and **Harbour Burger Co** (Sydney seed) in the page.

## Gotchas

- Do not submit before hydration — input/button stay `disabled` until then.
- Harbour Burger Co is Sydney (`harbour-burger-co`); it matches `q=burger`, not `city=melbourne`.
- Soft navigation can paint the Restaurants heading before rows arrive — wait for `a.restaurant-row` (e.g. Harbour Burger Co), not only `h1`.
