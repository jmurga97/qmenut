/**
 * Curated catalog of the font families QMenut self-hosts (via @fontsource in the consuming
 * app — see `apps/web/src/app/fonts.css`). A tenant may pick a `headingFont` and/or a
 * `bodyFont` by catalog id; the theme engine resolves the id to its CSS `stack` and feeds it
 * into `--qm-heading` / `--qm-body` (see `theme/apply-theme.ts`). Anything not chosen falls
 * back to the template preset's own `heading` / `body` string.
 *
 * Keep this list in sync with the @fontsource imports in `apps/web/src/app/fonts.css`: every
 * catalog `stack` must have its faces loaded there, and each entry's `weights` must match the
 * weights imported (so callers never request a weight that renders as faux-bold).
 */
export const QM_FONT_IDS = [
  "cormorant-garamond",
  "playfair-display",
  "yeseva-one",
  "anton",
  "bebas-neue",
  "quicksand",
  "jost",
  "spectral",
  "work-sans",
  "barlow",
  "nunito-sans",
  "dm-sans",
] as const;

export type QmFontId = (typeof QM_FONT_IDS)[number];

/** Which slot a family is suited for. `both` is valid for either heading or body. */
export type QmFontRole = "heading" | "body" | "both";

export interface QmFontCatalogEntry {
  id: QmFontId;
  /** Human label for pickers. */
  label: string;
  /** CSS `font-family` stack, matching the preset string format (quoted family + fallback). */
  stack: string;
  role: QmFontRole;
  /** Weights available as self-hosted faces — the guardrail against faux-bold on single-weight
   *  display faces (Anton, Bebas Neue, Yeseva One ship 400 only). */
  weights: number[];
}

export const QM_FONT_CATALOG: Record<QmFontId, QmFontCatalogEntry> = {
  "cormorant-garamond": {
    id: "cormorant-garamond",
    label: "Cormorant Garamond",
    stack: "'Cormorant Garamond',serif",
    role: "heading",
    weights: [500, 600, 700],
  },
  "playfair-display": {
    id: "playfair-display",
    label: "Playfair Display",
    stack: "'Playfair Display',serif",
    role: "heading",
    weights: [500, 600, 700],
  },
  "yeseva-one": {
    id: "yeseva-one",
    label: "Yeseva One",
    stack: "'Yeseva One',serif",
    role: "heading",
    weights: [400],
  },
  anton: {
    id: "anton",
    label: "Anton",
    stack: "'Anton',sans-serif",
    role: "heading",
    weights: [400],
  },
  "bebas-neue": {
    id: "bebas-neue",
    label: "Bebas Neue",
    stack: "'Bebas Neue',sans-serif",
    role: "heading",
    weights: [400],
  },
  quicksand: {
    id: "quicksand",
    label: "Quicksand",
    stack: "'Quicksand',sans-serif",
    role: "both",
    weights: [500, 600, 700],
  },
  jost: {
    id: "jost",
    label: "Jost",
    stack: "'Jost',sans-serif",
    role: "both",
    weights: [400, 500, 600],
  },
  spectral: {
    id: "spectral",
    label: "Spectral",
    stack: "'Spectral',serif",
    role: "both",
    weights: [400, 500, 600, 700],
  },
  "work-sans": {
    id: "work-sans",
    label: "Work Sans",
    stack: "'Work Sans',sans-serif",
    role: "both",
    weights: [400, 500, 600, 700],
  },
  barlow: {
    id: "barlow",
    label: "Barlow",
    stack: "'Barlow',sans-serif",
    role: "both",
    weights: [400, 500, 600, 700, 800],
  },
  "nunito-sans": {
    id: "nunito-sans",
    label: "Nunito Sans",
    stack: "'Nunito Sans',sans-serif",
    role: "body",
    weights: [400, 600, 700, 800],
  },
  "dm-sans": {
    id: "dm-sans",
    label: "DM Sans",
    stack: "'DM Sans',sans-serif",
    role: "body",
    weights: [400, 500, 700],
  },
};

function isFontId(value: unknown): value is QmFontId {
  return typeof value === "string" && value in QM_FONT_CATALOG;
}

/** Resolves a catalog id to its CSS `font-family` stack, or `undefined` if not a known id. */
export function getFontStack(id: unknown): string | undefined {
  return isFontId(id) ? QM_FONT_CATALOG[id].stack : undefined;
}

/** True if `value` is a catalog id usable in the heading slot (`heading` or `both`). */
export function isHeadingFontId(value: unknown): value is QmFontId {
  return isFontId(value) && QM_FONT_CATALOG[value].role !== "body";
}

/** True if `value` is a catalog id usable in the body slot (`body` or `both`). */
export function isBodyFontId(value: unknown): value is QmFontId {
  return isFontId(value) && QM_FONT_CATALOG[value].role !== "heading";
}
