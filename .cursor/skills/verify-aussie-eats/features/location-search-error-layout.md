# Location search error layout

Keep the Find restaurants near bar intact when browser geolocation fails.

## Sub-features

- **Use my location** still shows the permission error.
- Address field, Use my location, and Clear stay on one desktop row.
- The error sits below that row instead of joining the flex line.

## How to get to it (user POV)

Restaurants with an existing pin (`lat` / `lng` / `place`) → deny location → **Use my location**.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs location-search-error-layout
```

- Open `/restaurants` with a Sydney pin so Clear is visible.
- Force a geolocation denial and click **Use my location**.
- Assert the address field stays wide, the label stays one line, and the error is below the buttons.

## Gotchas

- This is a layout proof. Distance sort is covered by `location-based-browse`.
- Headless Chromium never prompts; the driver stubs `navigator.geolocation` to fail.
- Desktop viewport (1280) is required. The stacked mobile column is expected.
