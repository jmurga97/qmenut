# Admin dashboard

`apps/admin` is the restaurant owner's dashboard. Owners use it to manage the menu, the
branch, promotions, languages and translations, the theme, QR codes, loyalty, and billing.

This page is partial. It states the purpose, the structure, and the key files, but does
not yet contain a full walkthrough.

## Status

Complete. The application is a React 19 and Vite SPA that uses file-based TanStack Router,
TanStack Query, react-hook-form, Zustand, and Tailwind v4. It is deployed as a
static-asset Worker with an SPA fallback, configured in `apps/admin/wrangler.jsonc`. It
calls the API over tRPC at `/trpc` with session cookies, using
`credentials: "include"`. The development port is 5174.

## Structure

- Routes, in `apps/admin/src/app/routes/`. `login.tsx`, then `_auth.tsx`, which is the
  authentication guard and the shell, and then one `_auth.*` route per feature: `index`,
  `menu.*`, `branch`, `promotions.*`, `languages.*`, `theme`, `qr`, `loyalty.*`, and
  `billing`. `route-tree.gen.ts` is generated; do not edit it by hand.
- Features, in `apps/admin/src/features/<domain>/`. Each feature contains `pages/`, a
  controller hook, `api.ts` for tRPC calls, `mappers.ts`, and `types.ts`.
- Stores, in `apps/admin/src/app/store/`. `branch-store.ts`, `shell-store.ts`, and
  `theme-store.ts`, all built with Zustand.
- Shared code, in `apps/admin/src/shared/`. Form adapters, such as
  `components/forms/form-color-input.tsx`, and UI primitives.
- Auth client, in `apps/admin/src/lib/auth-client.ts`. See [Auth](../domains/auth.md).

## Key files

| Concern                         | Path                                                 |
| ------------------------------- | ---------------------------------------------------- |
| Application entry and providers | `apps/admin/src/app/main.tsx`, `providers.tsx`       |
| Authentication guard and shell  | `apps/admin/src/app/routes/_auth.tsx`                |
| Generated route tree            | `apps/admin/src/app/route-tree.gen.ts` (do not edit) |
| Feature directories             | `apps/admin/src/features/*`                          |
| Zustand stores                  | `apps/admin/src/app/store/*`                         |
| Auth client                     | `apps/admin/src/lib/auth-client.ts`                  |
| Worker configuration            | `apps/admin/wrangler.jsonc`                          |

## Limitations

- Each feature follows the same shape: pages, a controller hook, `api.ts`, `mappers.ts`,
  and `types.ts`. Follow it when you add a feature.
- The admin application never sends a restaurant ID. The tenant is derived on the server
  from the session. See [Multi-tenancy](../domains/multi-tenancy.md).
