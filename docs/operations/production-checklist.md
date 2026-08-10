# Production-readiness checklist

This is the ranked source of truth for what remains before public launch. Checked items
were resolved in source by the production-config/onboarding refresh; unchecked items need
Cloudflare, vendor-account, product, or legal work.

## P0 — blocks any production deploy

- [x] **Separate development localhost vars from production.** Top-level Wrangler vars
      remain local by design; every deployable app now has an explicit
      `[env.production]`/`env.production` block, and production deploys select it.
- [x] **Declare the API hostname in source.** `apps/api/wrangler.jsonc` maps the
      `qmenut-api` production environment to the `api.qmenut.app` custom domain. Confirm
      the route becomes active in the target zone after the first deploy because
      `workers_dev = false` leaves no workers.dev fallback.
- [x] **Provision real `TENANT_THEME` KV.** The old local-only fake
      `0f5d31e6c4a94b0f8a2d7c1b3e9f6a01` remains only as `preview_id`. Replace the
      all-zero production `id` in both `apps/web/wrangler.jsonc` and
      `apps/tenant-config/wrangler.jsonc` with the ID returned by Cloudflare.
- [x] **Set all production secrets.** Configure `BETTER_AUTH_SECRET`, byte-identical
      `THEME_WORKER_TOKEN` on API and tenant-config, `LOYALTY_TOKEN_SECRET`,
      `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and (if translations are enabled)
      `DEEPL_API_KEY`. Configure `MAPTILER_API_KEY` on the API before enabling branch
      address autocomplete. Never set `E2E_FIXED_OTP`.
- [x] **Replace Stripe price placeholders.** `STRIPE_PRICE_BASIC` and in production vars.
- [x] **Confirm and migrate remote D1.** Verify database
      `f3138d43-a32e-46f2-a9d9-b4e777b02d8a` exists in the deployment account, then apply
      every committed migration through `0002_branch_coordinates.sql` remotely with the
      production environment before deploying API, admin, and web.
- [x] **Remove per-tenant public-menu CORS scaling.** Browser `/trpc` is now same-origin
      and proxied by `qmenut-web` through `API_WORKER`; only the fixed admin origin remains
      in production `ALLOWED_ORIGINS`.
- [x] **Make legal pages tenant-specific.** The four legal fields live on `restaurants`, are
      editable from Sucursal, and are interpolated per tenant on `/aviso-legal` and `/privacidad`.
      QMenut's operator identity is centralized in `LEGAL_OPERATOR`.

## P1 — ship-blocking for a paying customer

- [x] **Replace mock-backed `/promos` and `/contacto`.** `use-promos-content.ts` and
      `use-contact-content.ts` still return `MOCK_*`; use the existing promotions API and
      effective-price data, and source real branch contact details.
- [??] **Make plan gating real or simplify pricing.** `getBranchEntitlement` and
      `requirePlan` are exported but unused, so the business plan unlocks nothing. Wire
      them into business-only procedures or launch with one plan.
- [x] **Create onboarding subscription state.** `create-tenant.ts` now inserts a
      `branch_subscriptions` trial row matching `branch.planCode`; Stripe webhook sync can
      replace its provider fields after checkout.
- [x] **Deploy `ming-email-worker` in the same Cloudflare account** and configure the
      sending domain's DKIM, SPF, and DMARC. The remote service binding and OTP login fail
      otherwise.
- [x] **Create observability projects.** Create Sentry projects for API/web/admin, fill
      runtime and build-time DSNs, and create the PostHog EU project/key.
- [x] **Choose visual snapshot support after CI removal.** The supported baseline is
      macOS-local for now; Linux must run the complete visual project in a pinned container
      before Linux baselines are added.

## P2 — should be done before public traffic

- [??] **Add response security headers.** `apps/web/public/_headers` currently sets only
      immutable asset caching. Define and validate CSP, `X-Content-Type-Options`,
      `Referrer-Policy`, and HSTS for the actual Sentry/PostHog/font/image origins.
- [x] **Remove generic tenant manifest branding.** `site.webmanifest` still identifies
      every tenant as QMenut with a shared theme colour; generate tenant-specific metadata
      or use a deliberately minimal manifest.
- [??] **Replace the universal OG fallback.** Tenants without a branch photo all use
      `og-default.png`; provide tenant branding or an intentional neutral fallback.
- [??] **Define backups and restore drills.** Record the D1 time-travel/export policy and
      schedule an export of `TENANT_THEME` KV, including a tested restore procedure.
- [??] **Collect timezone during intake.** The script now accepts `restaurant.timezone`
      and documents the `Europe/Madrid` default, but existing product intake/admin flows
      still need to require the correct zone outside Spain.
