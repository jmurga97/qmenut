# QR codes

This page describes the QR code generator in the admin dashboard. It produces a QR code
that points at the branch's public menu URL.

This page is partial. It states the purpose, the structure, and the key files, but does
not yet contain a full walkthrough.

## Status

Complete, and intentionally minimal. The feature runs entirely in the client, with no
backend call and no database row. It is venue-level: there is one QR code per venue host,
not one per table.

## How it works

- Route. `apps/admin/src/app/routes/_auth.qr.tsx` renders
  `apps/admin/src/features/qr/pages/qr-page.tsx`.
- Controller. `apps/admin/src/features/qr/hooks/use-qr-controller.ts`.
- Logic. `apps/admin/src/features/qr/services.ts` builds the menu URL from the tenant host
  through `buildMenuUrl`, which returns `https://{host}`, renders a canvas preview with
  the `qrcode` library, and downloads the result as PNG or SVG.

## Key files

| Concern             | Path                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| QR route            | `apps/admin/src/app/routes/_auth.qr.tsx`                                     |
| Page and controller | `apps/admin/src/features/qr/pages/qr-page.tsx`, `hooks/use-qr-controller.ts` |
| QR generation       | `apps/admin/src/features/qr/services.ts`                                     |

## Limitations

- There are no per-table QR codes and no scan tracking. Table-level codes or scan
  attribution would be a new feature with a backend and database component, not an
  extension of this one.
- The generated URL is `https://{customDomain}`, so the branch must have a domain set. See
  [Custom domains](custom-domains.md).
