# Location-based browse

Use browser location on the restaurant directory and sort venues by distance.

## Sub-features

- **Use my location** reads browser geolocation.
- The directory URL records `lat`, `lng`, and `place=My location`.
- Restaurant cards show distance and sort nearest first.

## How to get to it (user POV)

Primary nav **Restaurants** → **Use my location** → allow location access.

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs location-based-browse
```

- Grant browser geolocation at a Sydney coordinate and choose **Use my location**.
- Assert the URL has location params, the page says **Sorted by distance from My location**, and the first restaurant shows distance in kilometres.

## Gotchas

- Browser location permission is required; denial shows **Could not get your location**.
- **Use my location** and distance sorting work without a Google Maps key.
- Address autocomplete and interactive map pins still require `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Requires a seeded catalog so restaurant cards can show distance.
