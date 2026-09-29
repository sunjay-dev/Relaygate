#!/bin/bash
# Start a relaygate native binary and run scripts/smoke-check.mjs against it.
# Usage: bash scripts/smoke-native.sh [path-to-binary]
set -euo pipefail

BIN=${1:-dist/relaygate}
PORT=${PORT:-4187}
TOKEN=${PROXY_TOKEN:-smoketest-token}
BASE="http://127.0.0.1:$PORT"

if [[ ! -f "$BIN" ]]; then
  echo "binary not found: $BIN" >&2
  exit 1
fi

PROXY_TOKEN="$TOKEN" PORT="$PORT" "$BIN" &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

up=""
for _ in $(seq 1 40); do
  if HEALTH_URL="$BASE/health" node -e 'fetch(process.env.HEALTH_URL).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))'; then
    up=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "server exited early" >&2
    exit 1
  fi
  sleep 0.5
done

if [[ -z "$up" ]]; then
  echo "server did not become ready on $BASE" >&2
  exit 1
fi

node scripts/smoke-check.mjs "$BASE" "$TOKEN"
