---
name: pull-and-restart
description: Pull the latest git changes and restart the AussieEats Next.js dev server. Use when the user asks to pull the latest, sync with remote, restart the app, or get a fresh local run of AussieEats.
---

# Pull latest and restart AussieEats

## Workflow

Run these steps in order. Prefer one shell session with `required_permissions: ["all"]` so git, npm, and the long-lived `next dev` process work.

### 1. Stop an existing dev server

Check the terminals folder for a running `next dev` / `npm run dev` on this repo.

- If one is running, stop it (Ctrl+C / kill the PID) before starting again.
- Do not start a second server on port 3000.

### 2. Pull latest

From the repo root:

```bash
git status
git pull
```

- Stay on the current branch unless the user names another.
- If `git pull` fails due to local changes, show the conflict/status and ask before discarding or stashing.
- Do not commit, stash, or reset unless the user asks.

### 3. Install, migrate, and seed

After a successful pull:

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

- `npm install` covers lockfile / dependency updates and runs `prisma generate` via `postinstall`.
- Always apply migrations — a schema/client mismatch (e.g. missing `Restaurant.city`) breaks the storefront.
- Always reseed after pull/migrate so multi-city demo restaurants are present. Seed wipes and recreates demo users, restaurants, menus, and sample orders.

### 4. Start the app

```bash
npm run dev
```

- Run in the background; wait until Next.js reports Ready / Local URL.
- Confirm the app at http://localhost:3000.
- If port 3000 is busy, stop the old process and retry — do not silently switch ports unless necessary, then tell the user the URL.

## Done criteria

- Branch is up to date with remote (or pull outcome explained).
- Migrations applied and seed completed (mention city counts from seed output if available).
- Dev server is running and the Local URL is reported to the user.
