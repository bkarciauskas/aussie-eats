#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
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
HOST="${HOST:-127.0.0.1}"
API_PORT="${API_PORT:-8000}"
API_HOST="${API_HOST:-127.0.0.1}"

mkdir -p "$RUN_DIR"

api_health_ok() {
  local body
  body="$(curl -fsS --max-time 2 "http://$API_HOST:$API_PORT/health" 2>/dev/null || true)"
  grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' <<<"$body"
}

if [[ -f "$RUN_DIR/pid" ]]; then
  old_pid="$(cat "$RUN_DIR/pid")"
  if kill -0 "$old_pid" 2>/dev/null; then
    if "$SKILL_DIR/helpers/doctor.sh" >/dev/null 2>&1; then
      echo "verify instance already running (pid=$old_pid port=$(cat "$RUN_DIR/port" 2>/dev/null || echo '?') api_port=$(cat "$RUN_DIR/api_port" 2>/dev/null || echo "$API_PORT"))"
      exit 0
    fi
    echo "verify instance not ready (pid=$old_pid); waiting…" >&2
    for _ in $(seq 1 90); do
      if "$SKILL_DIR/helpers/doctor.sh" >/dev/null 2>&1; then
        echo "verify instance already running (pid=$old_pid port=$(cat "$RUN_DIR/port" 2>/dev/null || echo '?') api_port=$(cat "$RUN_DIR/api_port" 2>/dev/null || echo "$API_PORT"))"
        exit 0
      fi
      if ! kill -0 "$old_pid" 2>/dev/null; then
        rm -f \
          "$RUN_DIR/pid" "$RUN_DIR/port" "$RUN_DIR/host" "$RUN_DIR/pgid" "$RUN_DIR/listener_pid" \
          "$RUN_DIR/api_pid" "$RUN_DIR/api_port" "$RUN_DIR/api_host" "$RUN_DIR/api_pgid" \
          "$RUN_DIR/api_started" "$RUN_DIR/log_path" "$RUN_DIR/api_log_path"
        break
      fi
      sleep 1
    done
    if [[ -f "$RUN_DIR/pid" ]] && kill -0 "$(cat "$RUN_DIR/pid")" 2>/dev/null; then
      if ! "$SKILL_DIR/helpers/doctor.sh" >/dev/null 2>&1; then
        echo "verify instance unhealthy (pid=$old_pid); stopping before relaunch" >&2
        "$(dirname "$0")/cleanup.sh"
      else
        echo "verify instance already running (pid=$old_pid port=$(cat "$RUN_DIR/port" 2>/dev/null || echo '?') api_port=$(cat "$RUN_DIR/api_port" 2>/dev/null || echo "$API_PORT"))"
        exit 0
      fi
    fi
  else
    rm -f \
      "$RUN_DIR/pid" "$RUN_DIR/port" "$RUN_DIR/host" "$RUN_DIR/pgid" "$RUN_DIR/listener_pid" \
      "$RUN_DIR/api_pid" "$RUN_DIR/api_port" "$RUN_DIR/api_host" "$RUN_DIR/api_pgid" \
      "$RUN_DIR/api_started" "$RUN_DIR/log_path" "$RUN_DIR/api_log_path"
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
if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
  echo "created backend/.env from backend/.env.example"
fi

echo "$API_PORT" >"$RUN_DIR/api_port"
echo "$API_HOST" >"$RUN_DIR/api_host"

# Reuse a healthy FastAPI on API_PORT when present; otherwise start one we own.
if api_health_ok; then
  echo "reusing FastAPI on http://$API_HOST:$API_PORT"
  rm -f "$RUN_DIR/api_pid" "$RUN_DIR/api_pgid"
  echo "0" >"$RUN_DIR/api_started"
else
  if lsof -nP -iTCP:"$API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "API port $API_PORT in use but /health failed; set API_PORT=… or fix Mongo/uvicorn" >&2
    exit 1
  fi

  UVICORN_BIN="python3"
  UVICORN_ARGS=(-m uvicorn app.main:app --host "$API_HOST" --port "$API_PORT")
  if [[ -x "$ROOT/backend/.venv/bin/uvicorn" ]]; then
    UVICORN_BIN="$ROOT/backend/.venv/bin/uvicorn"
    UVICORN_ARGS=(app.main:app --host "$API_HOST" --port "$API_PORT")
  fi

  # Double-fork + setsid so IDE shell teardown cannot stop the API.
  python3 - "$ROOT" "$API_PORT" "$API_HOST" "$RUN_DIR" "$UVICORN_BIN" "${UVICORN_ARGS[@]}" <<'PY'
import os, sys, time
root, api_port, api_host, run_dir, uvicorn_bin = sys.argv[1:6]
uvicorn_args = sys.argv[6:]
log_path = os.path.join("/tmp", f"aussie-eats-verify-api-{api_port}.log")
open(os.path.join(run_dir, "api_log_path"), "w").write(log_path)

if os.fork() > 0:
    for _ in range(50):
        if os.path.exists(os.path.join(run_dir, "api_pid")):
            break
        time.sleep(0.05)
    sys.exit(0)

os.setsid()
if os.fork() > 0:
    sys.exit(0)

os.chdir(os.path.join(root, "backend"))
log = open(log_path, "w")
os.dup2(log.fileno(), 1)
os.dup2(log.fileno(), 2)
log.close()
devnull = open("/dev/null", "r")
os.dup2(devnull.fileno(), 0)
devnull.close()

pid = os.getpid()
pgid = os.getpgid(0)
open(os.path.join(run_dir, "api_pid"), "w").write(str(pid))
open(os.path.join(run_dir, "api_pgid"), "w").write(str(pgid))
os.execvp(uvicorn_bin, [uvicorn_bin, *uvicorn_args])
PY

  echo "1" >"$RUN_DIR/api_started"

  for _ in $(seq 1 50); do
    [[ -f "$RUN_DIR/api_pid" ]] && break
    sleep 0.1
  done
  if [[ ! -f "$RUN_DIR/api_pid" ]]; then
    echo "failed to record api pid; see $(cat "$RUN_DIR/api_log_path" 2>/dev/null || echo /tmp/aussie-eats-verify-api-*.log)" >&2
    exit 1
  fi

  echo "launched api pid=$(cat "$RUN_DIR/api_pid") on http://$API_HOST:$API_PORT"
  echo "waiting for FastAPI /health…"
  for _ in $(seq 1 60); do
    if api_health_ok; then
      echo "FastAPI ready"
      break
    fi
    if ! kill -0 "$(cat "$RUN_DIR/api_pid")" 2>/dev/null; then
      echo "api process exited early; see $(cat "$RUN_DIR/api_log_path" 2>/dev/null || echo /tmp/aussie-eats-verify-api-*.log)" >&2
      exit 1
    fi
    sleep 1
  done
  if ! api_health_ok; then
    echo "timed out waiting for FastAPI /health; see $(cat "$RUN_DIR/api_log_path" 2>/dev/null || echo /tmp/aussie-eats-verify-api-*.log)" >&2
    exit 1
  fi
fi

# Double-fork + setsid so IDE shell teardown (kill process group) cannot stop the server.
python3 - "$ROOT" "$PORT" "$RUN_DIR" "$API_HOST" "$API_PORT" <<'PY'
import os, sys, time
root, port, run_dir, api_host, api_port = sys.argv[1:6]
# Keep the growing server log outside the Next.js project tree so webpack
# file watching cannot thrash Fast Refresh on every stdout write.
log_path = os.path.join("/tmp", f"aussie-eats-verify-{port}.log")
open(os.path.join(run_dir, "log_path"), "w").write(log_path)

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
os.environ["API_BASE_URL"] = f"http://{api_host}:{api_port}"
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
  echo "failed to record daemon pid; see $(cat "$RUN_DIR/log_path" 2>/dev/null || echo /tmp/aussie-eats-verify-*.log)" >&2
  exit 1
fi

echo "launched pid=$(cat "$RUN_DIR/pid") on http://$HOST:$PORT (API_BASE_URL=http://$API_HOST:$API_PORT)"
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
    echo "launch process exited early; see $(cat "$RUN_DIR/log_path" 2>/dev/null || echo /tmp/aussie-eats-verify-*.log)" >&2
    exit 1
  fi
  sleep 1
done

echo "timed out waiting for server; see $(cat "$RUN_DIR/log_path" 2>/dev/null || echo /tmp/aussie-eats-verify-*.log)" >&2
exit 1
