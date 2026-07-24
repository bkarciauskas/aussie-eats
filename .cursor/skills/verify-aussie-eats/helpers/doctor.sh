#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$SKILL_DIR/.run"
PORT="${PORT:-}"
HOST="${HOST:-}"

if [[ -z "$PORT" && -f "$RUN_DIR/port" ]]; then
  PORT="$(cat "$RUN_DIR/port")"
fi
if [[ -z "$HOST" && -f "$RUN_DIR/host" ]]; then
  HOST="$(cat "$RUN_DIR/host")"
fi
PORT="${PORT:-3010}"
HOST="${HOST:-127.0.0.1}"

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
  if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "doctor: nothing listening on $PORT" >&2
    exit 1
  fi
fi

echo "doctor: ok ($url)"
