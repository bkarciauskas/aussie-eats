#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$SKILL_DIR/.run"
PORT="${PORT:-}"
API_PORT="${API_PORT:-}"

if [[ -z "$PORT" && -f "$RUN_DIR/port" ]]; then
  PORT="$(cat "$RUN_DIR/port")"
fi
if [[ -z "$API_PORT" && -f "$RUN_DIR/api_port" ]]; then
  API_PORT="$(cat "$RUN_DIR/api_port")"
fi
PORT="${PORT:-3010}"
API_PORT="${API_PORT:-8000}"

has_pids=false
if [[ -f "$RUN_DIR/pid" || -f "$RUN_DIR/listener_pid" || -f "$RUN_DIR/api_pid" ]]; then
  has_pids=true
fi

port_in_use() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

if [[ "$has_pids" == false ]] && ! port_in_use "$PORT"; then
  echo "cleanup: nothing to stop (no recorded pids)"
  exit 0
fi

pid="$(cat "$RUN_DIR/pid" 2>/dev/null || true)"
listener="$(cat "$RUN_DIR/listener_pid" 2>/dev/null || true)"
pgid="$(cat "$RUN_DIR/pgid" 2>/dev/null || true)"
api_pid="$(cat "$RUN_DIR/api_pid" 2>/dev/null || true)"
api_pgid="$(cat "$RUN_DIR/api_pgid" 2>/dev/null || true)"
api_started="$(cat "$RUN_DIR/api_started" 2>/dev/null || true)"

stop_pid() {
  local p="$1"
  [[ -z "$p" ]] && return 0
  if kill -0 "$p" 2>/dev/null; then
    kill "$p" 2>/dev/null || true
    sleep 1
    if kill -0 "$p" 2>/dev/null; then
      kill -9 "$p" 2>/dev/null || true
    fi
  fi
}

# Kill Next listener first, then launcher, then process group.
stop_pid "$listener"
stop_pid "$pid"
if [[ -n "${pgid:-}" && "$pgid" != "0" && "$pgid" != "1" ]]; then
  kill -- "-$pgid" 2>/dev/null || true
fi

# Last resort: only if our Next port is still held, kill that exact listener.
if port_in_use "$PORT"; then
  for lp in $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true); do
    if [[ "$lp" == "${listener:-}" || "$lp" == "${pid:-}" ]]; then
      stop_pid "$lp"
      continue
    fi
    lp_pgid="$(ps -o pgid= -p "$lp" 2>/dev/null | tr -d ' ' || true)"
    if [[ -n "${pgid:-}" && "$lp_pgid" == "$pgid" ]]; then
      stop_pid "$lp"
    fi
  done
fi

# Stop FastAPI only when this skill started it (never kill a reused shared API).
if [[ "$api_started" == "1" ]]; then
  stop_pid "$api_pid"
  if [[ -n "${api_pgid:-}" && "$api_pgid" != "0" && "$api_pgid" != "1" ]]; then
    kill -- "-$api_pgid" 2>/dev/null || true
  fi
  if port_in_use "$API_PORT"; then
    for lp in $(lsof -nP -iTCP:"$API_PORT" -sTCP:LISTEN -t 2>/dev/null || true); do
      if [[ "$lp" == "${api_pid:-}" ]]; then
        stop_pid "$lp"
        continue
      fi
      lp_pgid="$(ps -o pgid= -p "$lp" 2>/dev/null | tr -d ' ' || true)"
      if [[ -n "${api_pgid:-}" && "$lp_pgid" == "$api_pgid" ]]; then
        stop_pid "$lp"
      fi
    done
  fi
fi

if port_in_use "$PORT"; then
  echo "cleanup: port $PORT still in use; tracking files kept for retry" >&2
  exit 1
fi

if [[ "$api_started" == "1" ]] && port_in_use "$API_PORT"; then
  echo "cleanup: API port $API_PORT still in use; tracking files kept for retry" >&2
  exit 1
fi

rm -f \
  "$RUN_DIR/pid" "$RUN_DIR/port" "$RUN_DIR/host" "$RUN_DIR/pgid" "$RUN_DIR/listener_pid" \
  "$RUN_DIR/api_pid" "$RUN_DIR/api_port" "$RUN_DIR/api_host" "$RUN_DIR/api_pgid" \
  "$RUN_DIR/api_started" "$RUN_DIR/log_path" "$RUN_DIR/api_log_path"
echo "cleanup: stopped verify instance; evidence/ preserved"
