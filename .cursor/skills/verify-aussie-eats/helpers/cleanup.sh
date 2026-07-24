#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$SKILL_DIR/.run"

if [[ ! -f "$RUN_DIR/pid" && ! -f "$RUN_DIR/listener_pid" ]]; then
  echo "cleanup: nothing to stop (no recorded pids)"
  exit 0
fi

pid="$(cat "$RUN_DIR/pid" 2>/dev/null || true)"
listener="$(cat "$RUN_DIR/listener_pid" 2>/dev/null || true)"
pgid="$(cat "$RUN_DIR/pgid" 2>/dev/null || true)"
port="$(cat "$RUN_DIR/port" 2>/dev/null || true)"

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

# Kill listener first (next-server), then launcher, then process group.
stop_pid "$listener"
stop_pid "$pid"
if [[ -n "${pgid:-}" && "$pgid" != "0" && "$pgid" != "1" ]]; then
  kill -- "-$pgid" 2>/dev/null || true
fi

# Last resort: only if our port is still held, kill that exact listener.
if [[ -n "${port:-}" ]]; then
  for lp in $(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true); do
    # Only kill if it is our recorded listener or still a child of our pgid.
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

rm -f "$RUN_DIR/pid" "$RUN_DIR/port" "$RUN_DIR/host" "$RUN_DIR/pgid" "$RUN_DIR/listener_pid"
echo "cleanup: stopped verify instance; evidence/ preserved"
