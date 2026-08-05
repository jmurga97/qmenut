# Cloudflare deployment runbook

This is the zero-to-live runbook for QMenut. Deployments are manual and target the named
`production` environment. Top-level Wrangler configuration is development-only; never
deploy it to production without the environment selection documented below.

The production topology uses `qmenut.app`: API at `api.qmenut.app`, admin at
`admin.qmenut.app`, marketing at `qmenut.app` and `www.qmenut.app`, and one
`qmenut-web` Worker attached to each tenant's own custom domain.

## 0. Prerequisites

Have all of the following before provisioning:

- a Cloudflare account with `qmenut.app` added as an active zone;
- Bun `1.3.6` (the version pinned in the root `package.json`);
- Wrangler authenticated to the target account with `bunx wrangler login`;
- Stripe test and live accounts;
- a DeepL API key if automatic translations are required;
- a Sentry organization and separate API, web, and admin projects;
- a PostHog EU project;
- `ming-email-worker` deployed in the **same Cloudflare account**. The API's
  `EMAIL_WORKER` binding is remote and will not resolve across accounts.

Run commands from the repository root unless a command includes `--cwd`.

## 1. Provision resources in order

### D1

```bash
bunx wrangler d1 create qmenut-db-v2
```

Copy the returned `database_id` into
`env.production.d1_databases` in `apps/api/wrangler.jsonc`. The checked-in ID must be
confirmed against the target account; do not assume it exists there.

### Shared tenant-theme KV

```bash
bunx wrangler kv namespace create TENANT_THEME
```

Copy the returned `id` to both production bindings:

- `apps/web/wrangler.jsonc` → `env.production.kv_namespaces[0].id`
- `apps/tenant-config/wrangler.jsonc` → `env.production.kv_namespaces[].id`

The values must be byte-identical. Leave `preview_id` unchanged: local development and
E2E deliberately share that stable preview namespace in `.wrangler-shared/state`.

## 2. Fill production configuration

Before any deploy, resolve every unchecked P0 item in
[production-checklist.md](production-checklist.md). In particular:

- replace both all-zero production KV IDs;
- replace `price_basic_replace_me`;
- confirm the D1 ID;
- fill runtime Sentry DSNs as described under observability.

Wrangler named environments do not inherit `vars`, D1/KV bindings, services, rate limits,
assets, or observability. Each config therefore repeats its non-inheritable production
settings and pins `name` to the unsuffixed Worker name. Removing those names would create
workers such as `qmenut-api-production` and break service bindings.

## 3. Set secrets

| Secret                  | Worker(s)             | Source/notes                                                                                    |
| ----------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`    | API                   | Generate a long cryptographically random value.                                                 |
| `THEME_WORKER_TOKEN`    | API and tenant-config | Generate once and enter the exact same bytes twice; tenant-config compares it in constant time. |
| `LOYALTY_TOKEN_SECRET`  | API                   | Long random key for loyalty card and redemption tokens.                                         |
| `STRIPE_SECRET_KEY`     | API                   | Stripe live-mode secret key.                                                                    |
| `STRIPE_WEBHOOK_SECRET` | API                   | Signing secret for the live `https://api.qmenut.app/webhooks/stripe` endpoint.                  |
| `DEEPL_API_KEY`         | API                   | Optional; translation calls degrade without it.                                                 |

Example commands (each prompt reads the value without writing it to shell history):

```bash
bunx wrangler secret put BETTER_AUTH_SECRET --env production --cwd apps/api
bunx wrangler secret put THEME_WORKER_TOKEN --env production --cwd apps/api
bunx wrangler secret put THEME_WORKER_TOKEN --env production --cwd apps/tenant-config
bunx wrangler secret put LOYALTY_TOKEN_SECRET --env production --cwd apps/api
bunx wrangler secret put STRIPE_SECRET_KEY --env production --cwd apps/api
bunx wrangler secret put STRIPE_WEBHOOK_SECRET --env production --cwd apps/api
bunx wrangler secret put DEEPL_API_KEY --env production --cwd apps/api
```

Never set `E2E_FIXED_OTP` on a deployed Worker. The local guard in `create-auth.ts` is
defence in depth, not permission to configure it remotely.

## 4. Apply D1 migrations

Generate migrations only from the Drizzle schema, then apply the committed forward
migrations from `apps/api`:

```bash
bunx wrangler d1 migrations apply DB --remote --env production --cwd apps/api
```

The initial sequence contains `0000_baseline.sql`; later files are generated with
`bun run --cwd apps/api db:generate -- --name <change_name>`. Never use
`drizzle-kit push`, `wrangler d1 migrations create`, or edit an applied migration.

The `--env production` flag is mandatory: D1 bindings are non-inheritable, so the named
environment must declare the database. Review the command's remote database/account
summary before confirming.

Run the production preflight in
[database-migrations.md](database-migrations.md) (`db:check`, SQL review, pending-migration
list, production-data query, post-apply verification) before every remote apply.

## 5. Build-time environment

Vite variables are compiled into SPA/client bundles and cannot be changed through Worker
runtime vars. Any change requires rebuild and redeploy.

| App   | Build-time variables                                       |
| ----- | ---------------------------------------------------------- |
| Web   | `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` |
| Admin | `VITE_API_BASE_URL`, `VITE_SENTRY_DSN`                     |

For web production, **do not set `VITE_API_BASE_URL`**. Its browser client must use the
tenant origin's `/trpc`, which `qmenut-web` proxies through `API_WORKER`. The admin is the
only browser app that talks cross-origin to `https://api.qmenut.app` with session cookies.

## 6. Deploy in dependency order

Deploy tenant-config → API → web → admin → landing. Service bindings must reference
workers that already exist: API needs `qmenut-tenant-config` and `ming-email-worker`; web
needs `qmenut-api`.

```bash
bunx wrangler deploy --env production --cwd apps/tenant-config
bunx wrangler deploy --env production --cwd apps/api
```

### The web Worker is different

`@cloudflare/vite-plugin` selects the Wrangler environment **at build time** with
`CLOUDFLARE_ENV`. It writes `apps/web/.wrangler/deploy/config.json`, which points to the
resolved `apps/web/dist/server/wrangler.json`. The generated config already records
`targetEnvironment: "production"` and contains the selected bindings and vars.

Build with the production environment and build-time monitoring values, then deploy with
no `--env` flag:

```bash
CLOUDFLARE_ENV=production \
VITE_API_BASE_URL='' \
VITE_SENTRY_DSN='WEB_CLIENT_DSN' \
VITE_POSTHOG_KEY='POSTHOG_EU_KEY' \
VITE_POSTHOG_HOST='https://eu.i.posthog.com' \
bun run --cwd apps/web build

bunx wrangler deploy --cwd apps/web
```

The explicit empty `VITE_API_BASE_URL` overrides any developer value in an ignored local
`apps/web/.env`; leaving that file's localhost URL baked into a production client would be
unsafe. Browser code uses same-origin regardless, but the clean build is verified below.

Do not pass `--env production` to the second command: environment selection has already
happened and the deploy operates on the redirected generated config, not the source
`wrangler.jsonc`. Wrangler 4.118 accepts the redundant flag in a dry run, but it cannot
change the build's selected environment. Before deploy, inspect
`apps/web/dist/server/wrangler.json` and confirm it contains the real production KV ID,
`API_WORKER → qmenut-api`, and production runtime vars.

Build and deploy the remaining apps:

```bash
VITE_API_BASE_URL='https://api.qmenut.app' \
VITE_SENTRY_DSN='ADMIN_CLIENT_DSN' \
bun run --cwd apps/admin build
bunx wrangler deploy --env production --cwd apps/admin

bun run --cwd apps/landing build
bunx wrangler deploy --env production --cwd apps/landing
```

## 7. Routes and custom domains

Configure or verify these mappings:

- `api.qmenut.app` → `qmenut-api`. The custom-domain route is declared in
  `apps/api/wrangler.jsonc`; with `workers_dev = false`, the Worker is otherwise
  unreachable.
- `admin.qmenut.app` → `qmenut-admin`. Add it under the Worker's Domains & Routes.
- `qmenut.app` and `www.qmenut.app` → `qmenut-landing`.
- `qmenut-tenant-config` gets **no public route**. It is reachable only through the API's
  `THEME_WORKER` service binding; do not expose it to “fix” its lack of hostname.

Admin and API must share the `qmenut.app` registrable domain for the current Better Auth
same-site cookie configuration. If they move to unrelated domains, pass
`cookieMode: "cross-site"` from `apps/api/src/auth/create-auth.ts`; the option exists in
`packages/auth/src/index.ts` but is not currently selected.

For every tenant, take `branches.customDomain` and attach it to the single web Worker:

1. Cloudflare dashboard → Workers & Pages → `qmenut-web`.
2. Open **Settings → Domains & Routes**.
3. Choose **Add → Custom domain** and enter the exact hostname stored on the branch.
4. Wait for DNS and the managed TLS certificate to become active.

The customer's DNS must be delegated to Cloudflare, or the account must provision the
hostname with Cloudflare for SaaS. There is no path or wildcard tenant mapping in the
application: the Host header is the only selector, so the attached hostname and
`branches.customDomain` must match after normalization.

Create the D1/KV tenant data after its domain is known:

```bash
bun run --cwd apps/api tenant:create --file tenants/CUSTOMER.tenant.json --remote
```

The script publishes KV first, inserts D1, verifies both, and prints the custom-domain
attachment as its first manual follow-up. Its `--remote` mode explicitly selects the
production Wrangler environment for both D1 and KV.

## 8. Stripe

In Stripe live mode:

1. Create the Basic recurring product/price.
2. Put its `price_...` ID in `apps/api/wrangler.jsonc` production vars as
   `STRIPE_PRICE_BASIC`.
3. Register `https://api.qmenut.app/webhooks/stripe` as a webhook endpoint.
4. Subscribe it to the events the handler consumes:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Put the endpoint's live signing secret into API `STRIPE_WEBHOOK_SECRET`.
6. Redeploy API after changing price IDs because Wrangler vars are deployed config.

`sync-subscription-state.ts` maps the Stripe price/status into
`branch_subscriptions` and updates `branches.plan_code`. Unknown prices or subscriptions
without `restaurantId`/`branchId` metadata are ignored, so verify Checkout metadata too.

## 9. Observability

Create separate Sentry projects:

- API DSN → `apps/api/wrangler.jsonc` production `SENTRY_DSN` runtime var.
- Web Worker/SSR DSN → `apps/web/wrangler.jsonc` production `SENTRY_DSN` runtime var.
- Web browser DSN → build-time `VITE_SENTRY_DSN`.
- Admin browser DSN → build-time `VITE_SENTRY_DSN`.

Web SSR and browser may use the same web Sentry project, but they enter through different
configuration paths. Put the PostHog EU key/host only in the web build environment. Worker
production environments have observability enabled so Cloudflare logs remain available.

## 10. Smoke test

First verify API reachability:

```bash
curl --fail --show-error --silent https://api.qmenut.app/health
```

Expect `{"status":"ok"}`. Then open `https://admin.qmenut.app`, request an OTP for the
onboarded owner, confirm email delivery, and log in. Check that their branch and theme load.

Replace `TENANT_DOMAIN` below with an attached live tenant hostname:

```bash
curl --show-error --silent --dump-header - --output /dev/null https://TENANT_DOMAIN/
curl --show-error --silent --dump-header - --output /dev/null https://TENANT_DOMAIN/
curl --fail --show-error --silent https://TENANT_DOMAIN/robots.txt
curl --fail --show-error --silent https://TENANT_DOMAIN/sitemap.xml
```

On a cold cache/version, the first two HTML responses should report
`X-QMenut-Cache: MISS` then `X-QMenut-Cache: HIT`. Verify `robots.txt` advertises the same
host's sitemap and the sitemap contains canonical localized URLs.

Finally change the tenant theme in admin and repeat the first two curl calls. The
content-version bump must select a new key: `MISS`, then `HIT` again.

## 11. Rollback

List deployments and roll back the affected Worker by explicit name:

```bash
bunx wrangler deployments list --name qmenut-api
bunx wrangler rollback --name qmenut-api

bunx wrangler deployments list --name qmenut-tenant-config
bunx wrangler rollback --name qmenut-tenant-config

bunx wrangler deployments list --name qmenut-web
bunx wrangler rollback --name qmenut-web

bunx wrangler deployments list --name qmenut-admin
bunx wrangler rollback --name qmenut-admin

bunx wrangler deployments list --name qmenut-landing
bunx wrangler rollback --name qmenut-landing
```

Choose the previous healthy version when prompted and record why it was restored. D1
migrations are forward-only: Worker rollback does not revert schema. Repair an incompatible
schema with a new, compensating migration and deploy code compatible with both transition
states where possible.

For the Drizzle baseline cutover, the previous empty `qmenut-db` database
(`f3138d43-a32e-46f2-a9d9-b4e777b02d8a`) is retained until 2026-08-06 11:12 UTC. Before
that deadline, restore that ID and name in both API D1 binding declarations and redeploy
the API to roll back the binding. Delete the old database only after the deadline and a
second successful health, auth-session, public-menu database-read, and migration-list check.
