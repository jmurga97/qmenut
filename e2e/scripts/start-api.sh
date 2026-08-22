#!/usr/bin/env bash
set -euo pipefail

# Deterministic local/CI values passed directly to `wrangler dev`. The development deployment
# configures its fixed-OTP flag separately and never uses the remaining values below.
exec wrangler dev \
  --port 8787 \
  --var DEV_FIXED_OTP:true \
  --var NODE_ENV:test \
  --var BETTER_AUTH_SECRET:qmenut-e2e-better-auth-secret-2026-change-before-deploy \
  --var THEME_WORKER_TOKEN:dev-token \
  --var LOYALTY_TOKEN_SECRET:qmenut-e2e-loyalty-token-secret-2026-change-before-deploy \
  --var STRIPE_SECRET_KEY:sk_test_qmenut_e2e_placeholder \
  --var STRIPE_WEBHOOK_SECRET:whsec_qmenut_e2e_placeholder
