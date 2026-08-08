#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$SKILL_DIR/.run"
PORT="${PORT:-}"
HOST="${HOST:-}"
API_PORT="${API_PORT:-}"
API_HOST="${API_HOST:-}"

if [[ -z "$PORT" && -f "$RUN_DIR/port" ]]; then
  PORT="$(cat "$RUN_DIR/port")"
fi
if [[ -z "$HOST" && -f "$RUN_DIR/host" ]]; then
  HOST="$(cat "$RUN_DIR/host")"
fi
if [[ -z "$API_PORT" && -f "$RUN_DIR/api_port" ]]; then
  API_PORT="$(cat "$RUN_DIR/api_port")"
fi
if [[ -z "$API_HOST" && -f "$RUN_DIR/api_host" ]]; then
  API_HOST="$(cat "$RUN_DIR/api_host")"
fi
PORT="${PORT:-3010}"
HOST="${HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8000}"
API_HOST="${API_HOST:-127.0.0.1}"

api_url="http://$API_HOST:$API_PORT/health"
api_body="$(curl -fsS --max-time 5 "$api_url" || true)"
if [[ -z "$api_body" ]]; then
  echo "doctor: no response from $api_url (FastAPI down)" >&2
  exit 1
fi
if ! grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' <<<"$api_body"; then
  echo "doctor: unexpected FastAPI health payload: $api_body" >&2
  exit 1
fi

url="http://$HOST:$PORT/"
body="$(curl -fsS --max-time 5 "$url" || true)"
if [[ -z "$body" ]]; then
  echo "doctor: no response from $url" >&2
  exit 1
fi

if ! grep -q 'AussieEats' <<<"$body"; then
  echo "doctor: home missing AussieEats brand" >&2
  exit 1
fi
if ! grep -q 'restaurant-search-hero' <<<"$body"; then
  echo "doctor: home missing #restaurant-search-hero" >&2
  exit 1
fi

if [[ -f "$RUN_DIR/pid" ]]; then
  pid="$(cat "$RUN_DIR/pid")"
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "doctor: recorded pid $pid is not running" >&2
    exit 1
  fi
  # Best-effort: confirm something listens on our port (may be child of npm).
  # Next may bind IPv6-only (:::$PORT); plain lsof -iTCP can miss that on some hosts.
  if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 \
    && ! lsof -nP -i6TCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 \
    && ! netstat -ltn 2>/dev/null | grep -Eq ":${PORT}[[:space:]]"; then
    echo "doctor: nothing listening on $PORT" >&2
    exit 1
  fi
fi

if [[ -f "$RUN_DIR/api_pid" ]]; then
  api_pid="$(cat "$RUN_DIR/api_pid")"
  if ! kill -0 "$api_pid" 2>/dev/null; then
    echo "doctor: recorded api pid $api_pid is not running" >&2
    exit 1
  fi
fi

echo "doctor: ok (api=$api_url ui=$url)"
