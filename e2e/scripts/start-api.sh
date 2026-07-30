#!/usr/bin/env bash
set -euo pipefail

# Deterministic local/CI-only values. These are passed directly to `wrangler dev` and are never
# part of deployed Worker configuration.
exec wrangler dev \
  --port 8787 \
  --var E2E_FIXED_OTP:true \
  --var NODE_ENV:test \
  --var BETTER_AUTH_SECRET:qmenut-e2e-better-auth-secret-2026-change-before-deploy \
  --var THEME_WORKER_TOKEN:dev-token \
  --var LOYALTY_TOKEN_SECRET:qmenut-e2e-loyalty-token-secret-2026-change-before-deploy \
  --var STRIPE_SECRET_KEY:sk_test_qmenut_e2e_placeholder \
  --var STRIPE_WEBHOOK_SECRET:whsec_qmenut_e2e_placeholder
