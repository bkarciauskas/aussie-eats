# Cloud Agents (AussieEats)

Repo-managed Cloud Agent config lives in [`.cursor/environment.json`](../.cursor/environment.json). It is **container-free**: no Dockerfile; `install` refreshes deps on the base image, and `start` backgrounds both app processes.

## Processes

| Service | Command | Port | Health |
| --- | --- | --- | --- |
| FastAPI | `backend/.venv/bin/uvicorn app.main:app` | `8000` | `GET /health` → `{"status":"ok"}` |
| Next.js | `npm run dev` | `3000` | `GET /` |

`install` runs `npm ci`, creates `backend/.venv`, and `pip install -r backend/requirements.txt` (plus `python3.12-venv` via apt when missing). `start` runs [`scripts/cloud-agent-start.sh`](../scripts/cloud-agent-start.sh), which is idempotent and waits for both health checks.

## Required secrets

Configure these on the Cloud Agent environment (Secrets tab). Do not commit values.

| Secret | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string for FastAPI (`mongodb+srv://…`) |
| `JWT_SECRET` | Yes | FastAPI JWT signing key (32+ random characters) |

Optional but useful for full UI/auth demos:

| Secret | Purpose |
| --- | --- |
| `SESSION_SECRET` | iron-session cookie encryption on Next.js (32+ chars) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps / Places autocomplete on `/restaurants` |
| `API_BASE_URL` | Defaults to `http://127.0.0.1:8000` if unset |

## Network access (egress)

With restricted egress, allow Atlas hostnames:

- `*.mongodb.net`

Without that allowlist entry, uvicorn fails on startup when opening the Mongo client. Package installs need the usual registry domains (`registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`, etc.).

## Local verification

```bash
# same commands Cloud Agents run
# install (from environment.json)
sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3.12-venv python3-pip
npm ci
python3 -m venv backend/.venv
backend/.venv/bin/pip install -U pip
backend/.venv/bin/pip install -r backend/requirements.txt

# start + health
bash scripts/cloud-agent-start.sh
curl -sf http://127.0.0.1:8000/health
curl -sf -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000
```
