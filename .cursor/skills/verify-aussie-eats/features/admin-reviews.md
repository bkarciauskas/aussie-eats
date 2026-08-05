# Admin reviews — list, filter, remove

## What

Sign in as admin, open Reviews, filter the table, and remove a review with confirmation so the restaurant public rating unblends.

## Reach

`/admin/login` → `/admin/reviews`

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-reviews
```

Manual equivalent:

1. Open `/admin/login` and submit `admin@aussieeats.local` / `admin1234`
2. Click **Reviews** in the admin nav (or open `/admin/reviews`)
3. Confirm the reviews table lists seeded reviews with When / Customer / Restaurant / Rating / Comment / Actions
4. Use Search / Restaurant / Min stars + **Filter** to narrow the list
5. Click **Remove** on a row → confirm via **Confirm** (not Cancel)
6. Row disappears; restaurant public rating count on the storefront reflects the unblend

## Proof

- Admin nav includes **Reviews** with `aria-current="page"` on `/admin/reviews`
- Filters change the visible row set (search / restaurant / min stars)
- Remove requires inline Cancel · Confirm before deletion
- Removed review is gone from admin list and restaurant detail reviews
- No edit / bulk-remove / reply controls
