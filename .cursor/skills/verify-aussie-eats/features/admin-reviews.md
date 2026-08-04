# Admin reviews moderation

## What

Browse seeded customer reviews in admin, filter them, and remove one with confirmation so the restaurant public rating unblends.

## Reach

`/admin/login` → `/admin/reviews`

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-reviews
```

Manual equivalent:

1. Open `/admin/login` and sign in as `admin@aussieeats.local` / `admin1234`
2. Click **Reviews** in the admin nav (lands on `/admin/reviews`)
3. Confirm the table lists reviews (seeded count is typically 6) with When / Customer / Restaurant / Rating / Comment / Actions
4. Filter with Search (customer or comment), Restaurant, and Min stars, then click **Filter**
5. Click **Remove** on a row → see **Remove review?** with **Cancel** / **Confirm**
6. Click **Cancel** — the review row remains
7. Click **Remove** again → **Confirm** — the review disappears from the table and storefront restaurant review list

## Proof

- Admin nav includes **Reviews** linking to `/admin/reviews`
- Filters update the list via query params (`q`, `restaurantId`, `minStars`)
- Cancel leaves the review; Confirm deletes it and recalculates the restaurant rating
