#!/usr/bin/env bash
# Idempotent Cloud Agent start: FastAPI (:8000) + Next.js (:3000).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p /tmp/cursor/aussie-eats
UVICORN_LOG=/tmp/cursor/aussie-eats/uvicorn.log
NEXT_LOG=/tmp/cursor/aussie-eats/next.log

port_listening() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :${port}" 2>/dev/null | grep -q ":${port}"
  else
    curl -sf --max-time 1 "http://127.0.0.1:${port}" >/dev/null 2>&1
  fi
}

wait_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"
  local i
  for ((i = 1; i <= attempts; i++)); do
    if curl -sf --max-time 2 "$url" >/dev/null; then
      echo "${label} ready: ${url}"
      return 0
    fi
    sleep 1
  done
  echo "${label} failed to become ready: ${url}" >&2
  return 1
}

if ! port_listening 8000; then
  if [[ ! -x backend/.venv/bin/uvicorn ]]; then
    echo "missing backend/.venv (run install first)" >&2
    exit 1
  fi
  (
    cd backend
    # Secrets come from the Cloud Agent environment; .env is optional for local use.
    nohup .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 \
      >"$UVICORN_LOG" 2>&1 &
    echo $! >/tmp/cursor/aussie-eats/uvicorn.pid
  )
  echo "started uvicorn (pid $(cat /tmp/cursor/aussie-eats/uvicorn.pid))"
else
  echo "uvicorn already listening on :8000"
fi

if ! port_listening 3000; then
  nohup npm run dev -- --hostname 127.0.0.1 --port 3000 \
    >"$NEXT_LOG" 2>&1 &
  echo $! >/tmp/cursor/aussie-eats/next.pid
  echo "started next (pid $(cat /tmp/cursor/aussie-eats/next.pid))"
else
  echo "next already listening on :3000"
fi

wait_http "http://127.0.0.1:8000/health" "FastAPI"
wait_http "http://127.0.0.1:3000" "Next.js"
