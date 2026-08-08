---
name: pull-and-restart
description: Pull the latest git changes and restart the AussieEats Next.js + FastAPI dev servers. Use when the user asks to pull the latest, sync with remote, restart the app, or get a fresh local run of AussieEats.
---

# Pull latest and restart AussieEats

## Workflow

Run these steps in order. Prefer one shell session with `required_permissions: ["all"]` so git, npm, pip, and the long-lived uvicorn / `next dev` processes work.

### 1. Stop existing dev servers

Check the terminals folder for running `next dev` / `npm run dev` and `uvicorn` on this repo.

- If either is running, stop it (Ctrl+C / kill the PID) before starting again.
- Do not start a second Next server on port 3000 or a second API on port 8000.
- Cloud Agent environments may already have both via `scripts/cloud-agent-start.sh` — restart those the same way (stop recorded pids, then start again) when the user asked for a fresh run.

### 2. Pull latest

From the repo root:

```bash
git status
git pull
```

- Stay on the current branch unless the user names another.
- If `git pull` fails due to local changes, show the conflict/status and ask before discarding or stashing.
- Do not commit, stash, or reset unless the user asks.

### 3. Install (always); seed only when needed

```bash
npm install
if [[ -x backend/.venv/bin/pip ]]; then
  backend/.venv/bin/pip install -r backend/requirements.txt
else
  python3 -m pip install -r backend/requirements.txt
fi
```

There is **no Prisma**. Do not run `prisma migrate`, `prisma generate`, or touch `prisma/dev.db`.

**Do not seed on every pull.** Catalog/orders/reviews live in Mongo (`MONGODB_URI` / `MONGODB_DB`) and persist across pulls. Reseeding is usually a no-op for orders/reviews once present; avoid `FORCE_SEED_ORDERS=1` unless you intend to rebuild demo history.

After pull, check what changed:

| Change | Action |
| --- | --- |
| `package.json` / lockfile | Already covered by `npm install` |
| `backend/requirements.txt` | Already covered by pip install above |
| Missing env files | `cp .env.example .env` and/or `cp backend/.env.example backend/.env` (never overwrite secrets) |
| Empty Mongo catalog / missing demo users, or first checkout | `npm run db:seed` (and optionally `npm run db:import-places` for the large catalog) |
| Only app/docs/skill changes | Skip seed |

How to decide quickly after pull:

```bash
# backend / seed inputs in the pulled commits?
git diff --name-only HEAD@{1} HEAD -- backend/requirements.txt backend/app/seed.py backend/app/seed_data.json

# API reachable? (needs uvicorn + Mongo)
curl -sf http://127.0.0.1:8000/health || echo "api down"
```

Notes:

- `npm run db:seed` → `cd backend && python3 -m app.seed`. It upserts demo users and seeds sample orders/reviews **only when missing**. It bootstraps handwritten restaurants **only if the catalog is empty**; it does **not** delete Places-imported rows. Use `FORCE_SEED_ORDERS=1` only when you intentionally want to rebuild demo orders/reviews.
- Prefer `backend/.venv` when present (Cloud Agent install creates it); otherwise system `python3 -m pip` / `python3 -m uvicorn` is fine for local machines.
- Never drop or wipe the Mongo database as part of pull-and-restart unless the user explicitly asks.

### 4. Start both services

```bash
# terminal / background job 1 — FastAPI
cd backend && python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
# if venv exists: cd backend && .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# terminal / background job 2 — Next.js
npm run dev
```

On Cloud Agents, `bash scripts/cloud-agent-start.sh` is an acceptable equivalent (idempotent; waits on `/health` and Next `/`).

- Run both in the background; wait until uvicorn serves `/health` and Next.js reports Ready / Local URL.
- Confirm API: `curl -sf http://127.0.0.1:8000/health`
- Confirm UI: http://localhost:3000
- If port 3000 or 8000 is busy, stop the old process and retry — do not silently switch ports unless necessary, then tell the user the URLs.

## Done criteria

- Branch is up to date with remote (or pull outcome explained).
- `npm install` and pip install completed; seed only if the table above required it (mention what was skipped and why).
- FastAPI and Next are running; Local URL and `/health` are reported to the user.
