# Search suggestions and recent searches

## What

From the landing hero, find restaurants, cuisines, suburbs, and cities with
typeahead suggestions. Completed searches are available again as recent
searches.

## Reach

1. Open `/`
2. Wait until `#restaurant-search-hero` is enabled

## Drive

1. Focus `#restaurant-search-hero`, fill it with `burger`, and wait for the
   suggestions list.
2. Confirm **Harbour Burger Co** appears with the **Restaurant** label.
3. Clear the input, fill it with `bur`, and select **Burgers** with the
   **Cuisine** label.
4. Confirm navigation to `/restaurants` with `cuisine=Burgers`.
5. Return to `/`, focus the empty hero input, and confirm **Burgers** appears
   under **Recent searches**.
6. Select **Clear** and confirm the recent-search panel closes.

## Proof

- A screenshot or recording shows the `burger` suggestion list containing
  **Harbour Burger Co**
- Selecting **Burgers** navigates to `/restaurants?cuisine=Burgers`
- Returning home and focusing the empty search shows **Burgers** under
  **Recent searches**
- Clearing recents removes the list
- `proof.json` records the URLs and visible assertions with `passed: true`
