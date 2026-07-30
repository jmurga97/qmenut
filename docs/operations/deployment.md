# Deployment 🧩

> **Stub** — outline + pointers below; fill in with the real deploy commands and
> secret list when you next deploy.

## Purpose & status

🧩 Not yet written. qmenut deploys as four Cloudflare Workers. This doc should become
the runbook for deploying them and provisioning a new tenant's domain.

## What to document here

- **Per-worker deploy**: `apps/api`, `apps/tenant-config`, `apps/admin`, and the
  per-tenant `apps/web` (`wrangler deploy --name qmenut-web-<tenant>`). Note that
  `apps/web/wrangler.jsonc` is Nitro-generated at build — run wrangler from `apps/web`
  only after `vite build`.
- **The one-web-worker-per-tenant model** and how the Host header / `TENANT_HOST` var
  selects the tenant (see [../domains/custom-domains.md](../domains/custom-domains.md)).
- **Custom-domain provisioning at Cloudflare**: route/worker binding + TLS cert for a
  new `branches.customDomain`. This is the piece not visible in source.
- **The shared KV namespace id** must match across `apps/web/wrangler.jsonc` and
  `apps/tenant-config/wrangler.toml`.
- **Secrets & vars**: `THEME_WORKER_TOKEN`, Stripe keys + `STRIPE_PRICE_*`, Better Auth
  URL, DeepL key, Sentry DSNs, `EMAIL_WORKER` binding. Never set `E2E_FIXED_OTP` on a
  deployed worker. Cross-reference the pending-values checklist in the author's notes.
- **Migrations**: apply `apps/api/migrations/*.sql` via `db:migrate` (Wrangler D1).
- **CI**: `.github/workflows/e2e.yml` runs Playwright on PR + push to `main`; there is
  no deploy workflow yet.

## Pointers

| Concern | Path |
|---|---|
| Worker configs | `apps/*/wrangler.{toml,jsonc}` |
| Migrations + scripts | `apps/api/migrations/`, `apps/api/package.json` (`db:migrate*`) |
| Tenant creation script | `apps/api/scripts/create-tenant.ts`, `apps/api/tenants/` |
| Onboarding intake | [onboarding-intake.md](onboarding-intake.md) |
| CI | `.github/workflows/e2e.yml` |
