# AussieEats

Local-only multi-vendor food delivery demo (customer storefront + `/admin`) built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, and **Prisma + SQLite**. No Enatega, GraphQL, or external food APIs.

## Requirements

- Node.js **20.x** (22 also works)
- npm

## Quick start

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Example | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite file at `prisma/dev.db` |
| `SESSION_SECRET` | 32+ char string | iron-session cookie encryption |

### Demo logins

| Role | Email | Password |
| --- | --- | --- |
| Customer | `demo@aussieeats.local` | `demo1234` |
| Admin | `admin@aussieeats.local` | `admin1234` |

### Reset seed data

```bash
npm run db:seed
```

This clears and recreates users, restaurants, menus, and sample orders (idempotent wipe + reseed). For a full schema reset:

```bash
npm run db:reset
```

## Presenter script (≈3 minutes)

1. Open `/` — brand hero **AussieEats**, click **Use Sydney demo location**, then **Browse Sydney**.
2. If the restaurant list is empty, your browser location may be far from Sydney—use **Use Sydney demo location** on home, then return to `/restaurants`.
3. Open a restaurant (e.g. Harbour Burger Co) → **Add** items → **Cart** → **Checkout**.
4. Log in as `demo@aussieeats.local` / `demo1234` if prompted → confirm NSW address → **Place order** (Pay on delivery).
5. Confirm the order appears under **Orders**.
6. Open `/admin/login` → `admin@aussieeats.local` / `admin1234`.
7. Dashboard shows counts; **Orders** → advance status (`pending` → `preparing` → …).
8. **Restaurants** → pick one → **Menu** → edit an item price → save → verify on the storefront menu.

## Smoke checklist

- [ ] `npm install && npx prisma migrate dev && npm run db:seed && npm run dev` starts cleanly
- [ ] Unauthenticated browse of `/restaurants` and a menu works
- [ ] Sydney demo location button sets location for the session (localStorage)
- [ ] Cart works without login; checkout requires login
- [ ] Placing an order creates status `pending`, clears cart, shows in `/orders`
- [ ] AUD formatting (`$x.xx`) and AU address fields (suburb / NSW / postcode / +61) appear
- [ ] Admin login blocks non-admins from `/admin`
- [ ] Admin can edit a menu price and change an order’s status
- [ ] No runtime calls to `*.enatega.com` or external food backends

## Architecture notes

- **Persistence:** SQLite via Prisma (`prisma/dev.db`) — survives refresh; no separate DB server
- **Auth:** email/password + iron-session cookies (`CUSTOMER` / `ADMIN` roles)
- **Cart:** client React context + `localStorage`; server writes orders on checkout
- **Money:** integer cents; display with `Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })`
- **Images:** local assets under `public/images/`

## Useful scripts

| Script | Action |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run db:seed` | Reseed demo data |
| `npm run db:reset` | Drop DB, migrate, seed |
| `npm run lint` | ESLint |
