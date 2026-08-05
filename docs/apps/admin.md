# apps/admin — owner dashboard (SPA) 🧩

> **Stub** — Purpose + key files below; expand when needed.

## Purpose & status

✅ Complete. The restaurant owner's dashboard: manage menu, branch, promotions,
languages/translations, theme, QR, loyalty, and billing. React 19 + Vite **SPA**
(TanStack Router file-based, TanStack Query, react-hook-form, Zustand, Tailwind v4).
Deployed as a static-asset Worker with SPA fallback (`apps/admin/wrangler.jsonc`). Talks
to the API over tRPC (`/trpc`) with session cookies (`credentials: "include"`); dev
port 5174.

## Structure

- **Routes** (`apps/admin/src/app/routes/`): `login.tsx`, `_auth.tsx` (auth guard +
  shell), then `_auth.*` per feature — `index`, `menu.*`, `branch`, `promotions.*`,
  `languages.*`, `theme`, `qr`, `loyalty.*`, `billing`. `route-tree.gen.ts` is
  generated — don't edit by hand.
- **Features** (`apps/admin/src/features/<domain>/`): each has `pages/`, a controller
  hook, `api.ts` (tRPC calls), `mappers.ts`, `types.ts` — consistent per-feature shape.
- **Stores** (`apps/admin/src/app/store/`): `branch-store.ts`, `shell-store.ts`,
  `theme-store.ts` (Zustand).
- **Shared** (`apps/admin/src/shared/`): form adapters (e.g.
  `components/forms/form-color-input.tsx`), UI primitives.
- **Auth client**: `apps/admin/src/lib/auth-client.ts` (see
  [../domains/auth.md](../domains/auth.md)).

## Key files

| Concern | Path |
|---|---|
| App entry / providers | `apps/admin/src/app/main.tsx`, `providers.tsx` |
| Auth guard + shell | `apps/admin/src/app/routes/_auth.tsx` |
| Generated route tree | `apps/admin/src/app/route-tree.gen.ts` (do not edit) |
| Feature folders | `apps/admin/src/features/*` |
| Zustand stores | `apps/admin/src/app/store/*` |
| Auth client | `apps/admin/src/lib/auth-client.ts` |
| Worker config | `apps/admin/wrangler.jsonc` |

## Notes & gotchas

- Per-feature convention is `pages / controller-hook / api / mappers / types` — follow
  it when adding a feature.
- The admin never sends a restaurant id; the tenant is derived server-side from the
  session (see [../domains/multi-tenancy.md](../domains/multi-tenancy.md)).
