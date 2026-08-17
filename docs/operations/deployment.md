# Cloudflare deployment runbook

This page describes how to take qmenut from an empty Cloudflare account to a live
deployment. Deployments are manual and target the named `production` environment.
Top-level Wrangler configuration is for development only. Never deploy it to production
without the environment selection described here.

The production topology uses the `qmenut.app` zone: the API at `api.qmenut.app`, the admin
dashboard at `admin.qmenut.app`, the marketing site at `qmenut.app` and `www.qmenut.app`,
and one `qmenut-web` Worker attached to each tenant's own custom domain.

Run commands from the repository root unless the command includes `--cwd`.

## Before you begin

You need all of the following:

- A Cloudflare account with `qmenut.app` added as an active zone.
- Bun `1.3.6`, the version pinned in the root `package.json`.
- Wrangler authenticated to the target account with `bunx wrangler login`.
- Stripe test and live accounts.
- A DeepL API key, if automatic translations are required.
- A Sentry organization with separate API, web, and admin projects.
- A PostHog EU project.
- `ming-email-worker` deployed in the same Cloudflare account. The API's `EMAIL_WORKER`
  binding is remote and does not resolve across accounts.

## Step 1: Provision resources

Create the D1 database:

```bash
bunx wrangler d1 create qmenut-db-v2
```

Copy the returned `database_id` into `env.production.d1_databases` in
`apps/api/wrangler.jsonc`. Confirm the checked-in ID against the target account; do not
assume it exists there.

Create the shared tenant-theme KV namespace:

```bash
bunx wrangler kv namespace create TENANT_THEME
```

Copy the returned `id` into both production bindings:

- `apps/web/wrangler.jsonc`, at `env.production.kv_namespaces[0].id`.
- `apps/tenant-config/wrangler.jsonc`, at `env.production.kv_namespaces[].id`.

The two values must be byte-identical. Leave `preview_id` unchanged: local development and
end-to-end tests deliberately share that stable preview namespace in
`.wrangler-shared/state`.

## Step 2: Fill in production configuration

Before any deploy, resolve every unchecked P0 item in the
[production checklist](production-checklist.md). In particular:

- Replace both all-zero production KV IDs.
- Replace `price_basic_replace_me`.
- Confirm the D1 ID.
- Fill in the runtime Sentry DSNs described in [Step 9](#step-9-configure-observability).

Wrangler named environments do not inherit `vars`, D1 or KV bindings, services, rate
limits, assets, or observability settings. Each configuration file therefore repeats its
non-inheritable production settings and pins `name` to the unsuffixed Worker name.
Removing those names would create Workers such as `qmenut-api-production` and break the
service bindings.

## Step 3: Set secrets

| Secret                  | Workers               | Description                                                                               |
| ----------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`    | API                   | A long, cryptographically random value.                                                   |
| `THEME_WORKER_TOKEN`    | API and tenant-config | Generate once and enter the same bytes twice. tenant-config compares it in constant time. |
| `LOYALTY_TOKEN_SECRET`  | API                   | A long random key for loyalty card and redemption tokens.                                 |
| `STRIPE_SECRET_KEY`     | API                   | The Stripe live-mode secret key.                                                          |
| `STRIPE_WEBHOOK_SECRET` | API                   | The signing secret for the live `https://api.qmenut.app/webhooks/stripe` endpoint.        |
| `DEEPL_API_KEY`         | API                   | Optional. Translation calls degrade without it.                                           |

Each command prompts for the value and does not write it to your shell history:

```bash
bunx wrangler secret put BETTER_AUTH_SECRET --env production --cwd apps/api
```

```bash
bunx wrangler secret put THEME_WORKER_TOKEN --env production --cwd apps/api
```

```bash
bunx wrangler secret put THEME_WORKER_TOKEN --env production --cwd apps/tenant-config
```

```bash
bunx wrangler secret put LOYALTY_TOKEN_SECRET --env production --cwd apps/api
```

```bash
bunx wrangler secret put STRIPE_SECRET_KEY --env production --cwd apps/api
```

```bash
bunx wrangler secret put STRIPE_WEBHOOK_SECRET --env production --cwd apps/api
```

```bash
bunx wrangler secret put DEEPL_API_KEY --env production --cwd apps/api
```

Never set `E2E_FIXED_OTP` on a deployed Worker. The local guard in `create-auth.ts` is
defense in depth, not permission to configure the variable remotely.

## Step 4: Apply D1 migrations

Generate migrations only from the Drizzle schema, then apply the committed forward
migrations from `apps/api`:

```bash
bunx wrangler d1 migrations apply DB --remote --env production --cwd apps/api
```

The initial sequence contains `0000_baseline.sql`. Later files are generated with
`bun run --cwd apps/api db:generate -- --name <change_name>`. Never use
`drizzle-kit push` or `wrangler d1 migrations create`, and never edit an applied
migration.

The `--env production` flag is required, because D1 bindings are non-inheritable and the
named environment must declare the database. Review the command's remote database and
account summary before you confirm.

Run the production preflight in
[Database migrations](database-migrations.md) before every remote apply. It covers
`db:check`, the SQL review, the pending-migration list, the production-data query, and the
post-apply verification.

## Step 5: Set build-time environment variables

Vite variables are compiled into the SPA and client bundles and cannot be changed through
Worker runtime variables. Any change requires a rebuild and a redeploy.

| Application | Build-time variables                                       |
| ----------- | ---------------------------------------------------------- |
| Web         | `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` |
| Admin       | `VITE_API_BASE_URL`, `VITE_SENTRY_DSN`                     |

Do not set `VITE_API_BASE_URL` for the web production build. Its browser client must use
the tenant origin's `/trpc`, which `qmenut-web` proxies through `API_WORKER`. The admin
dashboard is the only browser application that calls `https://api.qmenut.app`
cross-origin with session cookies.

## Step 6: Deploy in dependency order

Deploy tenant-config, then the API, then web, then admin, then landing. Service bindings
must reference Workers that already exist: the API needs `qmenut-tenant-config` and
`ming-email-worker`, and web needs `qmenut-api`.

```bash
bunx wrangler deploy --env production --cwd apps/tenant-config
```

```bash
bunx wrangler deploy --env production --cwd apps/api
```

### Deploying the web Worker

The web Worker is deployed differently from the others. `@cloudflare/vite-plugin` selects
the Wrangler environment at build time through `CLOUDFLARE_ENV`. It writes
`apps/web/.wrangler/deploy/config.json`, which points to the resolved
`apps/web/dist/server/wrangler.json`. The generated configuration already records
`targetEnvironment: "production"` and contains the selected bindings and variables.

Build with the production environment and the build-time monitoring values:

```bash
CLOUDFLARE_ENV=production \
VITE_API_BASE_URL='' \
VITE_SENTRY_DSN='WEB_CLIENT_DSN' \
VITE_POSTHOG_KEY='POSTHOG_EU_KEY' \
VITE_POSTHOG_HOST='https://eu.i.posthog.com' \
bun run --cwd apps/web build
```

Then deploy with no `--env` flag:

```bash
bunx wrangler deploy --cwd apps/web
```

The explicit empty `VITE_API_BASE_URL` overrides any developer value in an ignored local
`apps/web/.env`. Leaving that file's localhost URL compiled into a production client would
be unsafe. Browser code uses the same origin regardless, but the clean build is verified
in [Step 10](#step-10-run-the-smoke-test).

Do not pass `--env production` to the deploy command. Environment selection has already
happened, and the deploy operates on the redirected generated configuration, not on the
source `wrangler.jsonc`. Wrangler 4.118 accepts the redundant flag in a dry run, but the
flag cannot change the environment selected at build time. Before deploying, inspect
`apps/web/dist/server/wrangler.json` and confirm that it contains the real production KV
ID, the `API_WORKER` binding to `qmenut-api`, and the production runtime variables.

### Deploying admin and landing

```bash
VITE_API_BASE_URL='https://api.qmenut.app' \
VITE_SENTRY_DSN='ADMIN_CLIENT_DSN' \
bun run --cwd apps/admin build
```

```bash
bunx wrangler deploy --env production --cwd apps/admin
```

```bash
bun run --cwd apps/landing build
```

```bash
bunx wrangler deploy --env production --cwd apps/landing
```

## Step 7: Configure routes and custom domains

Configure or verify these mappings:

- `api.qmenut.app` to `qmenut-api`. The custom-domain route is declared in
  `apps/api/wrangler.jsonc`. Because `workers_dev = false`, the Worker is otherwise
  unreachable.
- `admin.qmenut.app` to `qmenut-admin`. Add it under the Worker's Domains & Routes
  settings.
- `qmenut.app` and `www.qmenut.app` to `qmenut-landing`.
- `qmenut-tenant-config` gets no public route. It is reachable only through the API's
  `THEME_WORKER` service binding. Do not expose it in order to give it a hostname.

The admin dashboard and the API must share the `qmenut.app` registrable domain for the
current Better Auth same-site cookie configuration. If they move to unrelated domains,
pass `cookieMode: "cross-site"` from `apps/api/src/auth/create-auth.ts`. That option
exists in `packages/auth/src/index.ts` but is not currently selected.

For every tenant, take `branches.customDomain` and attach it to the single web Worker:

1. In the Cloudflare dashboard, go to Workers & Pages and open `qmenut-web`.
2. Open Settings > Domains & Routes.
3. Select Add > Custom domain and enter the exact hostname stored on the branch.
4. Wait for DNS and the managed TLS certificate to become active.

The customer's DNS must be delegated to Cloudflare, or the account must provision the
hostname with Cloudflare for SaaS. The application has no path-based or wildcard tenant
mapping: the `Host` header is the only selector, so the attached hostname and
`branches.customDomain` must match after normalization.

Create the D1 and KV tenant data after the domain is known:

```bash
bun run --cwd apps/api tenant:create --file tenants/CUSTOMER.tenant.json --remote
```

The script publishes to KV first, inserts the D1 rows, verifies both, and prints the
custom-domain attachment as its first manual follow-up. Its `--remote` mode selects the
production Wrangler environment for both D1 and KV.

## Step 8: Configure Stripe

In Stripe live mode:

1. Create the Basic recurring product and price.
2. Put its `price_...` ID in the production variables of `apps/api/wrangler.jsonc` as
   `STRIPE_PRICE_BASIC`.
3. Register `https://api.qmenut.app/webhooks/stripe` as a webhook endpoint.
4. Subscribe the endpoint to the events the handler consumes:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Put the endpoint's live signing secret into the API's `STRIPE_WEBHOOK_SECRET`.
6. Redeploy the API after changing price IDs, because Wrangler variables are deployed
   configuration.

`sync-subscription-state.ts` maps the Stripe price and status into `branch_subscriptions`
and updates `branches.plan_code`. Unknown prices, and subscriptions without
`restaurantId` or `branchId` metadata, are ignored, so verify the Checkout metadata as
well.

## Step 9: Configure observability

Create separate Sentry projects and assign their DSNs:

- The API DSN goes in the production `SENTRY_DSN` runtime variable in
  `apps/api/wrangler.jsonc`.
- The web Worker DSN goes in the production `SENTRY_DSN` runtime variable in
  `apps/web/wrangler.jsonc`.
- The web browser DSN goes in the build-time `VITE_SENTRY_DSN`.
- The admin browser DSN goes in the build-time `VITE_SENTRY_DSN`.

The web server and browser may use the same Sentry project, but they are configured
through different paths. Put the PostHog EU key and host only in the web build
environment. Worker production environments have observability enabled so that Cloudflare
logs remain available.

## Step 10: Run the smoke test

First verify that the API is reachable:

```bash
curl --fail --show-error --silent https://api.qmenut.app/health
```

Expect `{"status":"ok"}`. Then open `https://admin.qmenut.app`, request an OTP for the
onboarded owner, confirm that the email arrives, and sign in. Check that the branch and
theme load.

Replace `TENANT_DOMAIN` with an attached live tenant hostname and run:

```bash
curl --show-error --silent --dump-header - --output /dev/null https://TENANT_DOMAIN/
```

```bash
curl --fail --show-error --silent https://TENANT_DOMAIN/robots.txt
```

```bash
curl --fail --show-error --silent https://TENANT_DOMAIN/sitemap.xml
```

Run the first command twice. On a cold cache or version, the two HTML responses should
report `X-QMenut-Cache: MISS` and then `X-QMenut-Cache: HIT`. Verify that `robots.txt`
advertises the same host's sitemap and that the sitemap contains canonical localized URLs.

Finally, change the tenant theme in the admin dashboard and repeat the first command
twice. The content-version increment must select a new key, producing `MISS` and then
`HIT` again.

## Rollback

List deployments and roll back the affected Worker by name:

```bash
bunx wrangler deployments list --name qmenut-api
```

```bash
bunx wrangler rollback --name qmenut-api
```

The same two commands work for `qmenut-tenant-config`, `qmenut-web`, `qmenut-admin`, and
`qmenut-landing`.

Choose the previous healthy version when prompted, and record why it was restored.

D1 migrations are forward-only, so a Worker rollback does not revert the schema. Repair an
incompatible schema with a new, compensating migration, and where possible deploy code
that is compatible with both transition states.

For the Drizzle baseline cutover, the previous empty `qmenut-db` database
(`f3138d43-a32e-46f2-a9d9-b4e777b02d8a`) is retained until 2026-08-06 11:12 UTC. Before
that deadline, you can roll back the binding by restoring that ID and name in both API D1
binding declarations and redeploying the API. Delete the old database only after the
deadline has passed and after a second successful check of health, the auth session, a
public-menu database read, and the migration list.
