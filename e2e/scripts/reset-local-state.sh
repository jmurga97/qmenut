#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for port in 8787 8788 5174 4011; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "E2E reset refused: port $port is already in use. Stop the running app/E2E workers before resetting local state." >&2
    exit 1
  fi
done

rm -rf "$ROOT_DIR/apps/api/.wrangler/state/v3/d1"
rm -rf "$ROOT_DIR/.wrangler-shared/state"
rm -f "$ROOT_DIR/e2e/.auth/admin.json"

CI=true bun run --cwd "$ROOT_DIR/apps/api" db:migrate:local
bun run --cwd "$ROOT_DIR/apps/api" db:seed seed/seed-public-menu.sql
bun run --cwd "$ROOT_DIR/apps/api" db:seed seed/seed-e2e.sql
bun run --cwd "$ROOT_DIR/apps/tenant-config" seed:local
