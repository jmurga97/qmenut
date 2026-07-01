/**
 * The 5 QMenut archetypes — everything a tenant does NOT choose. A tenant only supplies an
 * archetype name plus `primary`/`secondary` colors (see `theme/derive.ts`); every other
 * visual decision (typography, geometry, photo layout, badge shape, nav chrome) comes from
 * here.
 *
 * Values are transcribed from the reference `qmenut-theme.js` engine (decoded out of the
 * `QMenut Variantes Standalone.html` design-doc bundle) — do not "clean up" or re-derive
 * them, they're the validated source of truth.
 */
export type QmArchetypeName = "fine" | "her" | "fast" | "cafe" | "tapas";

export type QmPhotoMode = "none" | "thumb" | "hero" | "heroxl";
export type QmBadgeShape = "outline" | "block" | "pill";
export type QmNavStyle = "bar" | "floating" | "solid";

/** Percentages mixed via `color-mix(in oklab, ...)` when deriving the color group. */
export interface QmToneMix {
  bgMix: number;
  inkMix: number;
  hairMix: number;
  tintMix: number;
  mutedMix: number;
}

export interface QmArchetypePreset {
  label: string;
  heading: string;
  body: string;
  headingWeight: number;
  dishWeight: number;
  fontScale: number;
  tracking: number;
  eyebrowCase: "uppercase" | "none";
  eyebrowSpacing: number;
  radius: number;
  borderWidth: number;
  rule: number;
  photoMode: QmPhotoMode;
  badgeShape: QmBadgeShape;
  navStyle: QmNavStyle;
  numbers: boolean;
  /** OKLCH chroma cap applied to the tenant's primary/secondary. `null` = no clamp. */
  saturationCap: number | null;
  /** Neutral background base the tenant's primary is mixed into for `--qm-bg`. */
  paper: string;
  cardShadow?: string;
  rowPad?: number;
  tone: QmToneMix;
}

export const ARCHETYPES: Record<QmArchetypeName, QmArchetypePreset> = {
  fine: {
    label: "Alta cocina",
    heading: "'Cormorant Garamond',serif",
    body: "'Jost',sans-serif",
    headingWeight: 600,
    dishWeight: 600,
    fontScale: 1,
    tracking: 0,
    eyebrowCase: "uppercase",
    eyebrowSpacing: 2.5,
    radius: 0,
    borderWidth: 1,
    rule: 1.5,
    photoMode: "none",
    badgeShape: "outline",
    navStyle: "bar",
    numbers: true,
    saturationCap: 0.055,
    paper: "#FAF8F3",
    tone: { bgMix: 4, inkMix: 16, hairMix: 14, tintMix: 14, mutedMix: 44 },
  },
  her: {
    label: "Herencia",
    heading: "'Yeseva One',serif",
    body: "'Spectral',serif",
    headingWeight: 400,
    dishWeight: 500,
    fontScale: 1,
    tracking: 0,
    eyebrowCase: "uppercase",
    eyebrowSpacing: 1.5,
    radius: 3,
    borderWidth: 1,
    rule: 2,
    photoMode: "thumb",
    badgeShape: "block",
    navStyle: "bar",
    numbers: true,
    saturationCap: 0.13,
    paper: "#F7EEE0",
    tone: { bgMix: 7, inkMix: 26, hairMix: 18, tintMix: 20, mutedMix: 46 },
  },
  fast: {
    label: "Fast food",
    heading: "'Anton',sans-serif",
    body: "'Barlow',sans-serif",
    headingWeight: 400,
    dishWeight: 700,
    fontScale: 1,
    tracking: 0,
    eyebrowCase: "uppercase",
    eyebrowSpacing: 1,
    radius: 16,
    borderWidth: 1,
    rule: 2,
    photoMode: "heroxl",
    badgeShape: "block",
    navStyle: "floating",
    numbers: false,
    saturationCap: null,
    paper: "#FFFDF8",
    cardShadow: "0 8px 22px rgba(40,30,20,.07)",
    tone: { bgMix: 3, inkMix: 30, hairMix: 13, tintMix: 22, mutedMix: 50 },
  },
  cafe: {
    label: "Cafetería",
    heading: "'Quicksand',sans-serif",
    body: "'Nunito Sans',sans-serif",
    headingWeight: 700,
    dishWeight: 700,
    fontScale: 1,
    tracking: 0,
    eyebrowCase: "none",
    eyebrowSpacing: 0.5,
    radius: 20,
    borderWidth: 1,
    rule: 1.5,
    photoMode: "hero",
    badgeShape: "pill",
    navStyle: "floating",
    numbers: false,
    saturationCap: 0.09,
    paper: "#F6F0E8",
    cardShadow: "0 6px 18px rgba(40,30,20,.05)",
    tone: { bgMix: 8, inkMix: 24, hairMix: 16, tintMix: 18, mutedMix: 48 },
  },
  tapas: {
    label: "Bar de tapas",
    heading: "'Bebas Neue',sans-serif",
    body: "'Work Sans',sans-serif",
    headingWeight: 400,
    dishWeight: 400,
    fontScale: 1.12,
    tracking: 0.5,
    eyebrowCase: "uppercase",
    eyebrowSpacing: 1.5,
    radius: 2,
    borderWidth: 1,
    rule: 2,
    photoMode: "thumb",
    badgeShape: "block",
    navStyle: "solid",
    numbers: false,
    saturationCap: 0.15,
    paper: "#F2ECE1",
    rowPad: 10,
    tone: { bgMix: 8, inkMix: 30, hairMix: 20, tintMix: 20, mutedMix: 46 },
  },
};
