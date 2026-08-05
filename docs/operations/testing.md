# Testing

QMenut's browser suite runs locally against the same multi-Worker shape used in
production. There is no CI workflow; deployment is manual.

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
second-tenant contexts. Tests run serially with one worker because they intentionally
share local D1/KV state.

Per `AGENTS.md`, do not add tests unless the user asks for them.

## Mandatory host setup

Install Chromium once, then map every seeded tenant hostname to loopback:

```bash
bunx playwright install chromium
echo "127.0.0.1 tapas.localhost fine.localhost cafe.localhost her.localhost fast.localhost" | sudo tee -a /etc/hosts
```

The `/etc/hosts` entry is mandatory. Playwright exercises one production-built web
Worker at port `4011` and changes only the request Host header to select a tenant. Without
OS-level resolution, those requests never reach the Worker.

Run the suite from the repository root:

```bash
bun run test:e2e
```

## Playwright projects

`e2e/playwright.config.ts` defines this dependency graph:

| Project       | Browser/device and scope                                                                |
| ------------- | --------------------------------------------------------------------------------------- |
| `setup`       | Desktop Chrome; logs in at admin and writes `.auth/admin.json`.                         |
| `admin`       | Desktop Chrome plus stored owner auth; `tests/admin`.                                   |
| `web`         | Pixel 7 at `http://tapas.localhost:4011`; mobile public tests except desktop/templates. |
| `web-desktop` | Desktop Chrome; `desktop-*.spec.ts`.                                                    |
| `visual`      | Pixel 7; conditional template snapshots.                                                |
| `cross`       | Desktop Chrome plus stored auth; admin/public integration journeys.                     |

All projects depend on `setup`. The `visual` project is registered when `CI` is truthy
or `E2E_VISUAL=1` is set.

## Local stack and reset

Playwright starts four servers:

1. API Worker at `:8787` with deterministic E2E-only vars.
2. Tenant-config Worker at `:8788` sharing persisted KV.
3. Admin Vite app at `:5174`.
4. A production build of the public web Worker at `:4011`.

`bun run --cwd e2e reset` runs `e2e/scripts/reset-local-state.sh`. It removes local D1,
`.wrangler-shared/state`, and stored auth; reapplies the generated Drizzle migrations; seeds the
public menu and E2E database rows; and seeds KV themes for all five templates. The suite's
wrapper runs cleanup SQL afterward because product deletes are intentionally soft deletes.

Useful flags:

- `E2E_REUSE_SERVERS=1` reuses an already-running stack while iterating.
- `E2E_VISUAL=1` registers the visual template project locally.
- `E2E_FIXED_OTP=true` is supplied only by `e2e/scripts/start-api.sh`. Never configure it
  on a deployed Worker. `create-auth.ts` also refuses fixed OTP when
  `NODE_ENV === "production"`.

## Fixed identities

| Identity                | Intended role            | OTP      |
| ----------------------- | ------------------------ | -------- |
| `e2e@test.local`        | Tapas owner / setup user | `000000` |
| `staff.e2e@test.local`  | Tapas staff              | `000000` |
| `admin.e2e@test.local`  | Tapas admin              | `000000` |
| `owner.fine@test.local` | Fine tenant owner        | `000000` |

These addresses and codes are local test fixtures, not deployable credentials.

## Visual snapshots

Snapshot paths are platform-scoped:

```text
{testDir}/snapshots/{testFilePath}/{platform}/{arg}{ext}
```

Browser rendering differs across operating systems, so macOS and Linux baselines are not
interchangeable. With the former workflow-dispatch job removed, the current supported
story is macOS-local snapshots. If Linux baselines become required, run the complete
`visual` project in a pinned Linux container and commit that platform directory; do not
copy or rename macOS images as Linux baselines.

```bash
E2E_VISUAL=1 bun run test:e2e -- --project=visual
```

Changing templates, fonts, or browser versions can legitimately require a reviewed
baseline update. Inspect diffs rather than blindly accepting them.
