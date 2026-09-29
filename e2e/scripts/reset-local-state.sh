#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

rm -rf "$ROOT_DIR/e2e/.auth" "$ROOT_DIR/e2e/test-results" "$ROOT_DIR/e2e/playwright-report"
if ! lsof -nP -iTCP:4011 -sTCP:LISTEN -t >/dev/null 2>&1; then
  rm -rf "$ROOT_DIR/.wrangler-shared/state/v3/cache"
fi

CI=true bun run --cwd "$ROOT_DIR/apps/api" db:migrate:local

# Keep the database file open for a running development Worker; reset its rows instead.
db_file="$(find "$ROOT_DIR/apps/api/.wrangler/state/v3/d1" -type f -name '*.sqlite' ! -name 'metadata.sqlite' -print -quit)"
if [[ -z "$db_file" ]]; then
  echo "E2E reset failed: local D1 database was not created." >&2
  exit 1
fi

bun - "$db_file" <<'BUN'
import { Database } from "bun:sqlite";

const db = new Database(process.argv[2]);
db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = OFF");
const tables = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations', '_cf_METADATA', 'allergens')").all();
db.transaction(() => {
  for (const { name } of tables) {
    if (name === "tags") db.exec("DELETE FROM tags WHERE is_system = 0");
    else db.exec(`DELETE FROM "${name.replaceAll('"', '""')}"`);
  }
  if (db.query("SELECT 1 FROM sqlite_master WHERE name = 'sqlite_sequence'").get()) {
    db.exec("DELETE FROM sqlite_sequence");
  }
})();
db.close();
BUN

bun run --cwd "$ROOT_DIR/apps/api" db:seed seed/seed-public-menu.sql
bun run --cwd "$ROOT_DIR/apps/api" db:seed seed/seed-e2e.sql

kv_file="$(mktemp)"
trap 'rm -f "$kv_file"' EXIT
(
  cd "$ROOT_DIR/apps/tenant-config"
  bun run --silent wrangler kv key list --binding TENANT_THEME --preview --local --persist-to ../../.wrangler-shared/state > "$kv_file"
  bun -e 'const keys = (await Bun.file(process.argv[1]).json()).map(({ name }) => name); await Bun.write(process.argv[1], JSON.stringify(keys))' "$kv_file"
  if [[ "$(cat "$kv_file")" != "[]" ]]; then
    bun run wrangler kv bulk delete "$kv_file" --force --binding TENANT_THEME --preview --local --persist-to ../../.wrangler-shared/state
  fi
)
bun run --cwd "$ROOT_DIR/apps/tenant-config" seed:local

# A new version makes any cached public pages from an already-running Worker unreachable.
bun -e 'const version = crypto.randomUUID(); const keys = ["tapas", "fine", "cafe", "her", "fast"].map(host => ({ key: `menuVersion:${host}.localhost`, value: version })); await Bun.write(process.argv[1], JSON.stringify(keys))' "$kv_file"
(
  cd "$ROOT_DIR/apps/tenant-config"
  bun run wrangler kv bulk put "$kv_file" --binding TENANT_THEME --preview --local --persist-to ../../.wrangler-shared/state
)
