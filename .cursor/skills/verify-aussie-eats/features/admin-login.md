# Admin login + dashboard

## What

Sign in as admin and reach the dashboard counts / orders tools.

## Reach

`/admin/login` (storefront session is separate).

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs admin-login
```

Manual equivalent:

1. Open `/admin/login`
2. Submit `admin@aussieeats.local` / `admin1234`
3. Land on `/admin`

## Proof

- URL is `/admin` (not bounced to login)
- Dashboard shows restaurant/order counts (seeded non-zero)
- Admin nav includes **Orders** and **Restaurants**
