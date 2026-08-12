# Production-readiness checklist

This page lists what remains before public launch, ranked by priority. Checked items were
resolved in source during the production-configuration and onboarding refresh. Unchecked
items need Cloudflare, vendor-account, product, or legal work.

## P0: blocks any production deploy

- [x] Separate development localhost variables from production. Top-level Wrangler
      variables remain local by design. Every deployable application now has an explicit
      `[env.production]` or `env.production` block, and production deploys select it.
- [x] Declare the API hostname in source. `apps/api/wrangler.jsonc` maps the `qmenut-api`
      production environment to the `api.qmenut.app` custom domain. Confirm that the route
      becomes active in the target zone after the first deploy, because
      `workers_dev = false` leaves no workers.dev fallback.
- [x] Provision a real `TENANT_THEME` KV namespace. The old local-only value
      `0f5d31e6c4a94b0f8a2d7c1b3e9f6a01` remains only as `preview_id`. Replace the
      all-zero production `id` in both `apps/web/wrangler.jsonc` and
      `apps/tenant-config/wrangler.jsonc` with the ID returned by Cloudflare.
- [x] Set all production secrets. Configure `BETTER_AUTH_SECRET`, a byte-identical
      `THEME_WORKER_TOKEN` on the API and tenant-config, `LOYALTY_TOKEN_SECRET`,
      `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and, if translations are enabled,
      `DEEPL_API_KEY`. Configure `MAPTILER_API_KEY` on the API before enabling branch
      address autocomplete. Never set `E2E_FIXED_OTP`.
- [x] Replace the Stripe price placeholders, including `STRIPE_PRICE_BASIC` in the
      production variables.
- [x] Confirm and migrate the remote D1 database. Verify that database
      `f3138d43-a32e-46f2-a9d9-b4e777b02d8a` exists in the deployment account, then apply
      every committed migration through `0002_branch_coordinates.sql` remotely with the
      production environment before deploying the API, admin, and web.
- [x] Remove per-tenant public-menu CORS entries. Browser `/trpc` requests are now
      same-origin and proxied by `qmenut-web` through `API_WORKER`, so only the fixed admin
      origin remains in the production `ALLOWED_ORIGINS`.
- [x] Make the legal pages tenant-specific. The four legal fields live on `restaurants`,
      are editable from the branch page, and are interpolated per tenant on `/aviso-legal`
      and `/privacidad`. qmenut's operator identity is centralized in `LEGAL_OPERATOR`.

## P1: blocks shipping to a paying customer

- [x] Replace the mock-backed `/promos` and `/contacto` pages. `use-promos-content.ts` and
      `use-contact-content.ts` still return `MOCK_*` values. Use the existing promotions
      API and effective-price data, and source real branch contact details.
- [ ] Make plan gating real, or simplify the pricing. `getBranchEntitlement` and
      `requirePlan` are exported but unused, so the business plan unlocks nothing. Wire
      them into business-only procedures, or launch with one plan.
- [x] Create onboarding subscription state. `create-tenant.ts` now inserts a
      `branch_subscriptions` trial row that matches `branch.planCode`. The Stripe webhook
      sync can replace its provider fields after checkout.
- [x] Deploy `ming-email-worker` in the same Cloudflare account, and configure the sending
      domain's DKIM, SPF, and DMARC records. The remote service binding and OTP sign-in
      fail otherwise.
- [x] Create the observability projects. Create Sentry projects for the API, web, and
      admin, fill in the runtime and build-time DSNs, and create the PostHog EU project and
      key.
- [x] Choose visual snapshot support after the CI removal. The supported baseline is
      macOS, generated locally. Linux baselines require running the complete visual project
      in a pinned container first.

## P2: should be done before public traffic

- [ ] Add response security headers. `apps/web/public/_headers` currently sets only
      immutable asset caching. Define and validate a CSP, `X-Content-Type-Options`,
      `Referrer-Policy`, and HSTS for the Sentry, PostHog, font, and image origins that
      are actually used.
- [x] Remove the generic tenant manifest branding. `site.webmanifest` identified every
      tenant as qmenut with a shared theme color. Generate tenant-specific metadata, or use
      a deliberately minimal manifest.
- [ ] Replace the universal Open Graph fallback. Tenants without a branch photo all use
      `og-default.png`. Provide tenant branding, or an intentional neutral fallback.
- [ ] Define backups and restore drills. Record the D1 time-travel and export policy, and
      schedule an export of the `TENANT_THEME` KV namespace, including a tested restore
      procedure.
- [ ] Collect the timezone during intake. The script accepts `restaurant.timezone` and
      documents the `Europe/Madrid` default, but the product intake and admin flows still
      need to require the correct zone outside Spain.
