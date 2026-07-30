# QR codes 🧩

> **Stub** — Purpose + key files below; expand when needed.
> Follows the [doc template](../README.md#the-doc-template).

## Purpose & status

✅ Complete, but intentionally minimal. The admin generates a QR code that points at
the branch's public menu URL. It is **client-side only** (no backend, no DB) and
**venue-level** — one QR per venue host, **not per table**.

## How it works

- Route: `apps/admin/src/app/routes/_auth.qr.tsx` →
  `apps/admin/src/features/qr/pages/qr-page.tsx`.
- Controller: `apps/admin/src/features/qr/hooks/use-qr-controller.ts`.
- Logic: `apps/admin/src/features/qr/services.ts` — builds the menu URL from the tenant
  host (`buildMenuUrl` → `https://{host}`), renders a canvas preview with the `qrcode`
  library, and downloads PNG/SVG. No API call.

## Key files

| Concern | Path |
|---|---|
| QR route | `apps/admin/src/app/routes/_auth.qr.tsx` |
| Page + controller | `apps/admin/src/features/qr/pages/qr-page.tsx`, `hooks/use-qr-controller.ts` |
| QR generation | `apps/admin/src/features/qr/services.ts` |

## Notes & gotchas

- No per-table QR and no scan tracking — if table-level QR or attribution is needed
  later, that's a new feature (backend + DB), not an extension of this one.
- The generated URL is just `https://{customDomain}` — depends on the branch having a
  domain set (see [custom-domains.md](custom-domains.md)).
