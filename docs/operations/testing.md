# Testing

The browser suite runs locally against the same multi-Worker topology used in production.
There is no CI workflow, and deployment is manual.

As stated in `AGENTS.md`, do not add tests unless you are asked to.

## Layout

```text
e2e/
├── fixtures/test.ts            authenticated role fixtures
├── helpers/
│   ├── a11y.ts                 axe setup/assertions
│   ├── trpc.ts                 typed HTTP helpers
│   └── tenant-config.ts        direct local tenant-config helpers
├── setup/auth.setup.ts         owner OTP login and storage state
└── tests/
    ├── admin/                  dashboard behavior, permissions, and accessibility
    ├── web/                    public pages, SEO, templates, isolation, and accessibility
    └── cross/                  admin-to-public invalidation and loyalty journeys
```

`e2e/fixtures/test.ts` extends Playwright with authenticated owner, admin, staff, and
second-tenant contexts. Tests run serially in a single worker because they intentionally
share the local D1 and KV state.

## Host setup

Install Chromium once, then map every seeded tenant hostname to loopback:

```bash
bunx playwright install chromium
```

```bash
echo "127.0.0.1 tapas.localhost fine.localhost cafe.localhost her.localhost fast.localhost" | sudo tee -a /etc/hosts
```

The `/etc/hosts` entry is required. Playwright exercises one production build of the web
Worker on port `4011` and changes only the request `Host` header to select a tenant.
Without operating-system-level resolution, those requests never reach the Worker.

Run the suite from the repository root:

```bash
bun run test:e2e
```

## Playwright projects

`e2e/playwright.config.ts` defines the following projects:

| Project       | Browser, device, and scope                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `setup`       | Desktop Chrome. Signs in to admin and writes `.auth/admin.json`.                                                  |
| `admin`       | Desktop Chrome with stored owner authentication. Runs `tests/admin`.                                              |
| `web`         | Pixel 7 at `http://tapas.localhost:4011`. Runs the mobile public tests, excluding the desktop and template specs. |
| `web-desktop` | Desktop Chrome. Runs `desktop-*.spec.ts`.                                                                         |
| `visual`      | Pixel 7. Runs the conditional template snapshots.                                                                 |
| `cross`       | Desktop Chrome with stored authentication. Runs the admin-to-public journeys.                                     |

All projects depend on `setup`. The `visual` project is registered when `CI` is truthy or
when `E2E_VISUAL=1` is set.

## Local stack and reset

Playwright starts four servers:

1. The API Worker on port `8787`, with deterministic test-only variables.
2. The tenant-config Worker on port `8788`, sharing the persisted KV namespace.
3. The admin Vite application on port `5174`.
4. A production build of the public web Worker on port `4011`.

To reset local state, run:

```bash
bun run --cwd e2e reset
```

That command runs `e2e/scripts/reset-local-state.sh`, which removes the local D1 database,
`.wrangler-shared/state`, and the stored authentication file; reapplies the generated
Drizzle migrations; seeds the public menu and the end-to-end database rows; and seeds the
KV themes for all five templates. The suite's wrapper runs cleanup SQL afterward, because
product deletes are soft deletes by design.

Three environment variables control a run:

| Variable              | Effect                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `E2E_REUSE_SERVERS=1` | Reuses an already-running stack while you iterate.                                                                                        |
| `E2E_VISUAL=1`        | Registers the visual template project locally.                                                                                            |
| `DEV_FIXED_OTP=true`  | Fixes OTP `000000` for every provisioned account; no email is sent. Supplied by the local and E2E API scripts and the development Worker. |

Never configure `DEV_FIXED_OTP` on the production Worker. `create-auth.ts` only accepts
the fixed OTP when `NODE_ENV` is `development` or `test`.

## Fixed identities

When `DEV_FIXED_OTP=true`, every provisioned account signs in with `000000`; the table
lists the seeded identities used by the suites.

| Identity                | Role                       | OTP      |
| ----------------------- | -------------------------- | -------- |
| `e2e@test.local`        | Tapas owner and setup user | `000000` |
| `staff.e2e@test.local`  | Tapas staff                | `000000` |
| `admin.e2e@test.local`  | Tapas admin                | `000000` |
| `owner.fine@test.local` | Fine tenant owner          | `000000` |

These addresses and codes are local test fixtures. They are not deployable credentials.

## Visual snapshots

Snapshot paths include the platform:

```text
{testDir}/snapshots/{testFilePath}/{platform}/{arg}{ext}
```

Browser rendering differs across operating systems, so macOS and Linux baselines are not
interchangeable. Since the workflow-dispatch job was removed, the supported baseline is
macOS, generated locally. If Linux baselines become necessary, run the complete `visual`
project in a pinned Linux container and commit that platform directory. Do not copy or
rename macOS images as Linux baselines.

```bash
E2E_VISUAL=1 bun run test:e2e -- --project=visual
```

Changing templates, fonts, or browser versions can legitimately require a new baseline.
Inspect the diffs before you accept them.
