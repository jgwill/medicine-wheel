#!/bin/sh
set -e

# Medicine Wheel Docker Entrypoint
#
# The Next.js app is pre-built. Data store is mounted at /data/store.
# Environment variables:
#   MW_DATA_DIR          — path to JSONL store directory (default: /data/store)
#   MW_STORAGE_PROVIDER  — storage backend (default: jsonl)
#   PORT                 — HTTP port (default: 8040)
#   HONCHO_URL           — when set, every stored beat, ceremony and diary entry
#                          is projected into Honcho (memory that reasons);
#                          HONCHO_WORKSPACE_ID (default medicine-wheel),
#                          HONCHO_API_KEY (unset while Honcho's auth is off)

STORE_DIR="${MW_DATA_DIR:-/data/store}"
PORT="${PORT:-8040}"

mkdir -p "$STORE_DIR"

echo "🌿 Medicine Wheel"
echo "📁 Store: $STORE_DIR"
echo "🌐 http://localhost:$PORT"
if [ -n "${HONCHO_URL:-}" ]; then
  echo "🧠 Honcho: $HONCHO_URL (workspace ${HONCHO_WORKSPACE_ID:-medicine-wheel})"
else
  echo "🧠 Honcho: off (set HONCHO_URL to project the wheel into memory)"
fi
echo ""

export MW_DATA_DIR="$STORE_DIR"
export MW_STORAGE_PROVIDER="${MW_STORAGE_PROVIDER:-jsonl}"
export PORT="$PORT"

exec node_modules/.bin/next start -p "$PORT"
