# Auth

This page describes how staff sign in. Authentication uses Better Auth with passwordless
email OTP. Sign-up is disabled: accounts are provisioned, and the user then signs in with
an emailed one-time code.

This page is partial. It states the purpose, the structure, and the key files, but does
not yet contain a full walkthrough.

Authentication determines who the user is. Authorization determines which tenant and role
they have, and is described in [Multi-tenancy](multi-tenancy.md).

## Status

Complete.

## How it works

- Server setup. `packages/auth/src/index.ts` configures Better Auth with the `emailOTP`
  plugin and the Drizzle adapter for SQLite with `usePlural`, a base path of `/api/auth`,
  and `disableSignUp: true`.
- OTP delivery. Codes are sent through the Cloudflare `EMAIL_WORKER` service binding by
  `createEmailWorkerOtpSender`. With `DEV_FIXED_OTP=true`, every provisioned account signs in
  with the fixed OTP `000000` and no email is sent: `apps/api/src/auth/create-auth.ts` registers
  a wildcard entry that `packages/auth/src/index.ts` resolves for any address. The local, test,
  and deployed development environments enable this flag; production ignores it.
- Configuration. `packages/auth/src/store.ts` sets the OTP length, expiry, attempt limit,
  and session expiry. The session schema is `packages/db/src/schema/auth.ts`.
- Active restaurant. The session carries an `activeRestaurantId` additional field
  (`packages/auth/src/index.ts`, column added to `sessions` in the same schema). It is
  written only through the `admin.auth.selectRestaurant` tRPC procedure, which re-checks
  membership before updating the session row; see [Multi-tenancy](multi-tenancy.md).
- Client. `packages/auth/src/client.ts` exports `createEmailOtpAuthClient`, which sets
  `credentials: include`. `apps/admin/src/lib/auth-client.ts` wraps it with the base URL
  and `signOut`.
- API mounting. `apps/api/src/index.ts` routes `/api/auth/*` to the Better Auth handler,
  and `apps/api/src/auth/create-auth.ts` builds that handler per request.
- tRPC integration. `protectedProcedure` in `apps/api/src/trpc/trpc.ts` reads the session
  through `ctx.getSession()`.

## Frontend

The sign-in page is `apps/admin/src/features/auth/pages/login-page.tsx`, a two-step flow
that collects the email address and then the OTP. Its route is
`apps/admin/src/app/routes/login.tsx`. When the account belongs to more than one
restaurant, sign-in continues on
`apps/admin/src/app/routes/select-restaurant.tsx`, which stores the choice in the
session before entering the dashboard. Protected routes are gated by
`apps/admin/src/app/routes/_auth.tsx`, which redirects to the selector when no tenant
resolves for the session.

## Key files

| Concern                    | Path                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| Better Auth server         | `packages/auth/src/index.ts`, `apps/api/src/auth/create-auth.ts`               |
| Auth store and tuning      | `packages/auth/src/store.ts`                                                   |
| Session schema             | `packages/db/src/schema/auth.ts`                                               |
| Auth client                | `packages/auth/src/client.ts`, `apps/admin/src/lib/auth-client.ts`             |
| API mount point            | `apps/api/src/index.ts` (`/api/auth/*`)                                        |
| Session in tRPC            | `apps/api/src/trpc/trpc.ts` (`protectedProcedure`)                             |
| Restaurant switching       | `apps/api/src/trpc/routers/auth.ts`, `apps/admin/src/features/auth/`           |
| Sign-in UI and route guard | `apps/admin/src/features/auth/`, `apps/admin/src/app/routes/{login,_auth}.tsx` |

## Limitations

- Sign-up is disabled by design. Provision accounts, and their `restaurant_users`
  membership rows, out of band.
- Never set `DEV_FIXED_OTP` on the production Worker.
