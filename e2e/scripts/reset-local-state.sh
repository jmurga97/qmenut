#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

rm -rf "$ROOT_DIR/apps/api/.wrangler/state/v3/d1"
rm -rf "$ROOT_DIR/.wrangler-shared/state"
rm -f "$ROOT_DIR/e2e/.auth/admin.json"

CI=true bun run --cwd "$ROOT_DIR/apps/api" db:migrate:local
bun run --cwd "$ROOT_DIR/apps/api" db:seed:local
bun run --cwd "$ROOT_DIR/apps/api" db:seed:e2e
bun run --cwd "$ROOT_DIR/apps/tenant-config" seed:local
