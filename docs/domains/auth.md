# Auth 🧩

> **Stub** — Purpose + key files below; expand when needed.
> Follows the [doc template](../README.md#the-doc-template).

## Purpose & status

✅ Complete. Staff sign in with **Better Auth email OTP** (passwordless). Sign-up is
**disabled** — accounts are provisioned, then the user logs in with an emailed
one-time code. Authentication (who you are) is separate from authorization (which
tenant/role), which lives in [multi-tenancy.md](multi-tenancy.md).

## How it works

- Server setup: `packages/auth/src/index.ts` — Better Auth with the `emailOTP` plugin,
  Drizzle adapter (SQLite, `usePlural`), basePath `/api/auth`, `disableSignUp: true`.
- OTP delivery: via the Cloudflare `EMAIL_WORKER` service binding
  (`createEmailWorkerOtpSender`). E2E uses fixed OTP `000000` for test accounts
  (`apps/api/src/auth/create-auth.ts`, `E2E_FIXED_OTP`, local-only).
- Config/tuning: `packages/auth/src/store.ts` (OTP length, expiry, attempts, session
  expiry). Session schema: `packages/db/src/schema/auth.ts`.
- Client: `packages/auth/src/client.ts` (`createEmailOtpAuthClient`, `credentials:
  include`) wrapped by `apps/admin/src/lib/auth-client.ts` (base URL + `signOut`).
- API mounting: `apps/api/src/index.ts` routes `/api/auth/*` to the Better Auth
  handler; `apps/api/src/auth/create-auth.ts` builds it per request.
- In tRPC: `protectedProcedure` (`apps/api/src/trpc/trpc.ts`) reads the session via
  `ctx.getSession()`.

## Frontend

- Login UI: `apps/admin/src/features/auth/pages/login-page.tsx` (two-step email → OTP);
  route `apps/admin/src/app/routes/login.tsx`. Protected routes gated by
  `apps/admin/src/app/routes/_auth.tsx`.

## Key files

| Concern | Path |
|---|---|
| Better Auth server | `packages/auth/src/index.ts`, `apps/api/src/auth/create-auth.ts` |
| Auth store/tuning | `packages/auth/src/store.ts` |
| Session schema | `packages/db/src/schema/auth.ts` |
| Auth client | `packages/auth/src/client.ts`, `apps/admin/src/lib/auth-client.ts` |
| API mount | `apps/api/src/index.ts` (`/api/auth/*`) |
| Session in tRPC | `apps/api/src/trpc/trpc.ts` (`protectedProcedure`) |
| Login UI + guard | `apps/admin/src/features/auth/`, `apps/admin/src/app/routes/{login,_auth}.tsx` |

## Notes & gotchas

- **Sign-up is off by design** — provision accounts (and their `restaurant_users`
  membership) out of band.
- `E2E_FIXED_OTP` must never be set on a deployed worker.
