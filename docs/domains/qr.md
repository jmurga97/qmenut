# QR and printed menu

Admin-only, fully client-side: no backend endpoint, no database row. One QR per branch host, not per table. The `/qr` page (`_auth.qr.tsx`) has two tabs.

## Código QR

- `apps/admin/src/features/qr/` builds `https://{customDomain}/?utm_source=qr` with the shared `buildQrUrl`, previews it with `qrcode`, downloads PNG or SVG. The branch needs a domain.
- The web keeps `utm_source` in its validated search and sends PostHog a one-time `qr_visit` plus `from_qr` on `menu_view`.
- No per-table codes, no scan tracking (that would need a backend).

## Carta para imprimir (`menuPrint`, Business)

`apps/admin/src/features/menu-print/` reads `menu.publicData({ host })` and the branch theme. No PDF endpoint, no saved settings.

```text
A4 portrait                 Folded A4 landscape (duplex, short edge)
┌──────┬──────┐             exterior  ┌──────┬──────┐  interior ┌──────┬──────┐
│ col1 │ col2 │  × 2 pages            │  4   │  1   │           │  2   │  3   │
└──────┴──────┘                       └──────┴──────┘           └──────┴──────┘
duplex, long edge, 12 mm margins      10 mm panel inset, 25 mm QR bottom-right of the last panel
```

- Default language, source currency, base prices; descriptions, allergens, variants, extras. No photos or promotions; logo kept.
- Theme engine supplies colors and fonts. Text is measured after fonts load; dishes never split; category headings repeat. Overflow blocks printing until fewer categories are selected.
- **Imprimir / Guardar PDF** opens the browser dialog: A4, 100%, no headers/footers, background graphics on.

Pagination check:

```bash
bun apps/admin/src/features/menu-print/paginate.check.ts
```
