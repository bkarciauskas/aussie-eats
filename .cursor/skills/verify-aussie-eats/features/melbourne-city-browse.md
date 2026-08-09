# Melbourne city browse

Home city picker → **Browse Melbourne restaurants** filters the directory to Melbourne venues (`city=melbourne`).

## Sub-features

- City pin button sets the session location.
- Browse link navigates to `/restaurants?city=melbourne`.
- Directory excludes other cities (e.g. Sydney’s Harbour Burger Co).

## How to get to it (user POV)

Home `/` → **Melbourne** → **Browse Melbourne restaurants**.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs melbourne-city-browse
```

- Select Melbourne, follow the browse link.
- Assert URL has `city=melbourne`, ≥3 `a.restaurant-row` titles, at least one known Melbourne seed name (Fitzroy Smash / Carlton Nonna / South Yarra Sushi), and **no** Harbour Burger Co.

## Gotchas

- Do **not** expect exactly three rows — snapshot restore has ~100+ Melbourne venues; handwritten seed alone has three.
- Harbour Burger Co is Sydney; its absence is part of the proof.
- Wait for city buttons to enable (hydration) before clicking.
