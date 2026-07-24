# Customer login

## What

Sign in as the demo customer and reach an authenticated storefront session.

## Reach

Header **Log in** → `/login`, or open `/login` directly.

## Drive

```bash
.cursor/skills/verify-aussie-eats/helpers/drive.mjs customer-login
```

Manual equivalent:

1. Open `/login`
2. Submit pre-filled `demo@aussieeats.local` / `demo1234` via **Sign in**
3. Land on `/` (or `next` redirect target)

## Proof

- After submit, header shows **Log out** (not **Log in**)
- No error text under the form
- Optional: `/orders` loads without redirecting back to `/login`
