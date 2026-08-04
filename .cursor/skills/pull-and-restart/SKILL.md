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

### 3. Install (always); migrate / seed only when needed

```bash
npm install
```

`npm install` covers lockfile / dependency updates and runs `prisma generate` via `postinstall`.

**Do not migrate or seed on every pull.** Local catalog/orders/reviews live in `prisma/dev.db` (gitignored SQLite). That file persists across pulls; it is not in git. Reseeding is usually a no-op for orders/reviews once present; avoid `FORCE_SEED_ORDERS=1` unless you intend to rebuild demo history.

After pull, check what changed:

| Change | Action |
| --- | --- |
| `package.json` / lockfile | Already covered by `npm install` |
| `prisma/migrations/**` or `prisma/schema.prisma` | `npx prisma migrate dev` |
| Missing `prisma/dev.db`, or restaurant catalog empty | `npx prisma migrate dev` then `npm run db:seed` (and optionally `npm run db:import-places` for the large catalog) |
| Only app/docs/skill changes | Skip migrate and seed |

How to decide quickly after pull:

```bash
# migrations / schema in the pulled commits?
git diff --name-only HEAD@{1} HEAD -- prisma/migrations prisma/schema.prisma

# DB present?
test -f prisma/dev.db && echo "db ok" || echo "db missing"
```

Notes:

- `prisma migrate dev` when already applied is a cheap no-op ("already in sync") — safe if unsure whether migrations changed.
- `db:seed` upserts demo users and seeds sample orders/reviews **only when missing**. It bootstraps handwritten restaurants **only if the catalog is empty**; it does **not** delete Places-imported rows. Use `FORCE_SEED_ORDERS=1` only when you intentionally want to rebuild demo orders/reviews.
- Never run `db:reset` as part of pull-and-restart unless the user explicitly asks.

### 4. Start the app

```bash
npm run dev
```

- Run in the background; wait until Next.js reports Ready / Local URL.
- Confirm the app at http://localhost:3000.
- If port 3000 is busy, stop the old process and retry — do not silently switch ports unless necessary, then tell the user the URL.

## Done criteria

- Branch is up to date with remote (or pull outcome explained).
- `npm install` completed; migrate/seed only if the table above required it (mention what was skipped and why).
- Dev server is running and the Local URL is reported to the user.
