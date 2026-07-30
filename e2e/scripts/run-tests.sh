#!/usr/bin/env bash
set -uo pipefail

playwright test "$@"
test_status=$?

# Product deletes are intentionally soft deletes. Remove test-only rows and auth artifacts after
# Playwright exits so repeated local runs leave the seeded development database clean.
bun run cleanup
cleanup_status=$?

if (( test_status != 0 )); then
  exit "$test_status"
fi

exit "$cleanup_status"
