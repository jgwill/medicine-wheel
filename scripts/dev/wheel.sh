#!/usr/bin/env bash
#
# The dev Medicine Wheel: its own port, its own store, its own Honcho workspace.
#
# The chronicle wheel that people depend on (ilex, :8040, Honcho workspace
# `medicine-wheel`) is never reachable from anything started here: the port,
# the store and the workspace are all different, and MW_API_URL is cleared so
# an ambient one cannot route this process's writes to a server it did not mean.
#
# Every value can be overridden from the environment; the defaults are eury's.
#
#   ./scripts/dev/wheel.sh
#   MW_DEV_PORT=8150 HONCHO_WORKSPACE_ID=my-workspace ./scripts/dev/wheel.sh
#
set -euo pipefail
cd "$(dirname "$0")/../.."

PORT="${MW_DEV_PORT:-8140}"
export MW_STORAGE_PROVIDER="${MW_STORAGE_PROVIDER:-jsonl}"
export MW_DATA_DIR="${MW_DATA_DIR:-$PWD/.mw/store}"          # gitignored
export HONCHO_URL="${HONCHO_URL:-http://127.0.0.1:8133}"
export HONCHO_WORKSPACE_ID="${HONCHO_WORKSPACE_ID:-medicine-wheel-dev}"
unset MW_API_URL                                              # this process is the server, not a client

if [ "$HONCHO_WORKSPACE_ID" = "medicine-wheel" ]; then
  echo "refusing: 'medicine-wheel' is the production workspace. Name another." >&2
  exit 2
fi

mkdir -p "$MW_DATA_DIR"
echo "🌿 dev wheel  : http://127.0.0.1:$PORT"
echo "📂 store      : $MW_DATA_DIR"
echo "🧠 honcho     : $HONCHO_URL (workspace $HONCHO_WORKSPACE_ID)"
exec npx next dev -p "$PORT"
