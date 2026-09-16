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
  `QrPanel` and the independent `features/menu-print` module.
- Controller. `apps/admin/src/features/qr/hooks/use-qr-controller.ts`.
- Logic. `apps/admin/src/features/qr/services.ts` builds the menu URL from the tenant host
  through the shared `buildQrUrl`, renders a canvas preview with
  the `qrcode` library, and downloads the result as PNG or SVG.

## Key files

| Concern             | Path                                                                               |
| ------------------- | ---------------------------------------------------------------------------------- |
| QR route            | `apps/admin/src/app/routes/_auth.qr.tsx`                                           |
| Page and controller | `apps/admin/src/app/routes/_auth.qr.tsx`, `features/qr/hooks/use-qr-controller.ts` |
| QR generation       | `apps/admin/src/features/qr/services.ts`                                           |

## Limitations

- There are no per-table QR codes and no scan tracking. Table-level codes or scan
  attribution would be a new feature with a backend and database component, not an
  extension of this one.
- The generated URL is `https://{customDomain}/?utm_source=qr`, so the branch must have a domain set. See
  [Custom domains](custom-domains.md). The `utm_source=qr` parameter marks visits that come from the printed
  code: the web app reads `utm_source` from its validated search (kept under the literal key so
  client-side navigation never rewrites the URL) and PostHog receives a one-time `qr_visit` event
  plus a `from_qr` property on `menu_view`.

## Printed menu

The `/qr` workspace has separate **Código QR** and **Carta para imprimir** tabs.
`apps/admin/src/features/menu-print` reads `menu.publicData({ host })` and the saved
branch theme; it does not create a PDF endpoint or persist print settings.

- A4 portrait: two columns on each of two pages, duplex along the long edge.
- Folded A4 landscape: exterior panels **4 | 1**, interior **2 | 3**, duplex along
  the short edge. Each panel has a 10 mm inset; portrait pages have 12 mm margins.
- The menu uses the restaurant's default language, source currency and base prices,
  with descriptions, allergens, combos, variants and extras. Dish/category photos
  and temporary promotions are omitted; the branch logo is retained when available.
- The shared theme engine supplies colors and fonts. Text is measured after the fonts
  load; dishes stay whole and category headings repeat across columns or panels.
  Overflow blocks printing until the owner selects fewer categories.
- A 25 mm vector QR sits at the bottom right of the reverse/last folded panel, with
  reserved space. It always uses the branch menu URL and `utm_source=qr`.
- **Imprimir / Guardar PDF** opens the browser print dialog. Use A4, 100% scale,
  no browser headers/footers and background graphics. Save as PDF there.

Shared QR generation and print asset/document hooks live under the admin's `shared`
layer. Preview and print use the same HTML/CSS composition. The four-panel pagination
check is runnable with:

```bash
bun apps/admin/src/features/menu-print/paginate.check.ts
```
