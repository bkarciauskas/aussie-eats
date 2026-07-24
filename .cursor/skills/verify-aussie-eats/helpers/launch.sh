#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$SKILL_DIR/.run"
PORT="${PORT:-3010}"
HOST="${HOST:-127.0.0.1}"

mkdir -p "$RUN_DIR"

if [[ -f "$RUN_DIR/pid" ]]; then
  old_pid="$(cat "$RUN_DIR/pid")"
  if kill -0 "$old_pid" 2>/dev/null; then
    if "$SKILL_DIR/helpers/doctor.sh" >/dev/null 2>&1; then
      echo "verify instance already running (pid=$old_pid port=$(cat "$RUN_DIR/port" 2>/dev/null || echo '?'))"
      exit 0
    fi
    echo "verify instance unhealthy (pid=$old_pid); stopping before relaunch" >&2
    "$(dirname "$0")/cleanup.sh" || true
  else
    rm -f "$RUN_DIR/pid" "$RUN_DIR/port" "$RUN_DIR/host" "$RUN_DIR/pgid" "$RUN_DIR/listener_pid"
  fi
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $PORT already in use by another process; set PORT=… to a free port" >&2
  exit 1
fi

cd "$ROOT"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "created .env from .env.example"
fi

# Double-fork + setsid so IDE shell teardown (kill process group) cannot stop the server.
python3 - "$ROOT" "$PORT" "$RUN_DIR" <<'PY'
import os, sys, time
root, port, run_dir = sys.argv[1], sys.argv[2], sys.argv[3]
log_path = os.path.join(run_dir, "log")

if os.fork() > 0:
    # parent of first fork — wait briefly for pid file then exit
    for _ in range(50):
        if os.path.exists(os.path.join(run_dir, "pid")):
            break
        time.sleep(0.05)
    sys.exit(0)

os.setsid()
if os.fork() > 0:
    sys.exit(0)

os.chdir(root)
os.environ["PORT"] = port
# Redirect stdio before exec
log = open(log_path, "w")
os.dup2(log.fileno(), 1)
os.dup2(log.fileno(), 2)
log.close()
devnull = open("/dev/null", "r")
os.dup2(devnull.fileno(), 0)
devnull.close()

# Record daemon pid/pgid then exec npm
pid = os.getpid()
pgid = os.getpgid(0)
open(os.path.join(run_dir, "pid"), "w").write(str(pid))
open(os.path.join(run_dir, "pgid"), "w").write(str(pgid))
os.execvp("npm", ["npm", "run", "dev"])
PY

echo "$PORT" >"$RUN_DIR/port"
echo "$HOST" >"$RUN_DIR/host"

# Wait for pid file from daemon
for _ in $(seq 1 50); do
  [[ -f "$RUN_DIR/pid" ]] && break
  sleep 0.1
done

if [[ ! -f "$RUN_DIR/pid" ]]; then
  echo "failed to record daemon pid; see $RUN_DIR/log" >&2
  exit 1
fi

echo "launched pid=$(cat "$RUN_DIR/pid") on http://$HOST:$PORT"
echo "waiting for ready…"

for _ in $(seq 1 90); do
  if "$SKILL_DIR/helpers/doctor.sh" >/dev/null 2>&1; then
    listener="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)"
    if [[ -n "$listener" ]]; then
      echo "$listener" >"$RUN_DIR/listener_pid"
    fi
    echo "ready"
    exit 0
  fi
  if ! kill -0 "$(cat "$RUN_DIR/pid")" 2>/dev/null; then
    echo "launch process exited early; see $RUN_DIR/log" >&2
    exit 1
  fi
  sleep 1
done

echo "timed out waiting for server; see $RUN_DIR/log" >&2
exit 1
