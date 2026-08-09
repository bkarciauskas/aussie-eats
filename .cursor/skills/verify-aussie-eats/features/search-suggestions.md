# Search suggestions and recent searches

Hero typeahead for restaurants, cuisines, suburbs, and cities; completed searches reappear as recent searches.

## Sub-features

- Debounced fetch to `/api/search/suggest` (~200ms).
- Kind labels: **Restaurant**, **Cuisine**, **City**, **Suburb**, **Recent**.
- Cuisine suggestion navigates to `/restaurants?cuisine=…` (location params may append).
- Restaurant suggestion navigates to `/restaurants/{slug}`.
- Empty-focus shows **Recent searches** with **Clear**.

## How to get to it (user POV)

1. Open `/`.
2. Wait until `#restaurant-search-hero` is enabled.
3. Type into the hero search (or focus empty after prior searches).

## Driving it with drive.mjs

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs search-suggestions
```

- Type `burger` → assert listbox shows **Harbour Burger Co** with **Restaurant**.
- Clear, type `bur` → select **Burgers** / **Cuisine** → URL includes `cuisine=Burgers`.
- Return home, focus empty input → **Burgers** under **Recent searches** → **Clear** hides the list.

## Gotchas

- Wait for `#restaurant-search-hero-suggestions` after the debounce; do not assert on a fixed sleep alone.
- Selecting a restaurant suggestion goes to the detail slug, not the directory list.
- Header search (`#restaurant-search-header`) shares the same component; this proof drives the hero.
