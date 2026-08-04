# Favourites

## Goal

Prove a signed-in customer can save a restaurant from browse, find it on `/favourites`, and keep it after a reload.

## Steps

1. Sign in at `/login?next=/restaurants` with the demo customer.
2. On `/restaurants`, locate the first restaurant card and ensure its heart is not selected.
3. Capture the browse list with the unselected heart.
4. Select the heart and verify its accessible pressed state changes to `true`.
5. Open **Favourites** from the primary navigation.
6. Reload `/favourites`.
7. Verify the saved restaurant card remains visible and capture the result.
8. Remove the restaurant to leave the demo account clean.

## Pass criteria

- The heart saves without opening the restaurant detail page.
- `/favourites` contains the same restaurant.
- The save persists after a page reload.
