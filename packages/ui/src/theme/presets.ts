/**
 * The 5 QMenut templates — everything a tenant does NOT choose. A tenant only supplies a
 * template name plus `primary`/`secondary` colors (see `theme/derive.ts`); every other
 * visual decision (typography, geometry, photo layout, badge shape, nav chrome) comes from
 * here.
 *
 * Values began from the reference `qmenut-theme.js` engine and are now tuned as product
 * defaults for the mobile-first client menu view.
 */
export type QmTemplateName = "fine" | "her" | "fast" | "cafe" | "tapas";

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

export interface QmTemplatePreset {
  label: string;
  heading: string;
  body: string;
  headingWeight: number;
  dishWeight: number;
  /** Weight of the section numeral ("01"), which is set in the template's heading face. */
  numWeight: number;
  /** Weight of the price figure. Calm by default; `fast` stays loud. */
  priceWeight: number;
  fontScale: number;
  tracking: number;
  eyebrowCase: "uppercase" | "none";
  eyebrowSpacing: number;
  /** Text-transform for dish/featured/modal names. Optional; omitted = `none`. */
  dishCase?: "uppercase" | "none";
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

export const TEMPLATES: Record<QmTemplateName, QmTemplatePreset> = {
  fine: {
    label: "Alta cocina",
    heading: "'Cormorant Garamond',serif",
    body: "'Jost',sans-serif",
    headingWeight: 600,
    dishWeight: 600,
    numWeight: 500,
    priceWeight: 600,
    fontScale: 0.96,
    tracking: 0,
    eyebrowCase: "uppercase",
    eyebrowSpacing: 3,
    radius: 0,
    borderWidth: 1,
    rule: 1,
    photoMode: "none",
    badgeShape: "outline",
    navStyle: "bar",
    numbers: true,
    saturationCap: 0.055,
    paper: "#FAF8F3",
    rowPad: 12,
    tone: { bgMix: 4, inkMix: 16, hairMix: 14, tintMix: 14, mutedMix: 44 },
  },
  her: {
    label: "Herencia",
    heading: "'Yeseva One',serif",
    body: "'Spectral',serif",
    headingWeight: 400,
    dishWeight: 500,
    numWeight: 400,
    priceWeight: 700,
    fontScale: 0.95,
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
    rowPad: 12,
    tone: { bgMix: 7, inkMix: 26, hairMix: 18, tintMix: 20, mutedMix: 46 },
  },
  fast: {
    label: "Fast food",
    heading: "'Anton',sans-serif",
    body: "'Barlow',sans-serif",
    headingWeight: 400,
    dishWeight: 700,
    numWeight: 400,
    priceWeight: 800,
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
    cardShadow: "0 10px 26px rgba(40,30,20,.10)",
    tone: { bgMix: 3, inkMix: 30, hairMix: 13, tintMix: 22, mutedMix: 50 },
  },
  cafe: {
    label: "Cafetería",
    heading: "'Quicksand',sans-serif",
    body: "'Nunito Sans',sans-serif",
    headingWeight: 700,
    dishWeight: 700,
    numWeight: 700,
    priceWeight: 700,
    fontScale: 0.97,
    tracking: 0,
    eyebrowCase: "none",
    eyebrowSpacing: 0.5,
    radius: 20,
    borderWidth: 1,
    rule: 1,
    photoMode: "hero",
    badgeShape: "pill",
    navStyle: "floating",
    numbers: false,
    saturationCap: 0.09,
    paper: "#F6F0E8",
    cardShadow: "0 6px 18px rgba(40,30,20,.05)",
    rowPad: 14,
    tone: { bgMix: 8, inkMix: 24, hairMix: 16, tintMix: 18, mutedMix: 48 },
  },
  tapas: {
    label: "Bar de tapas",
    heading: "'Bebas Neue',sans-serif",
    body: "'Work Sans',sans-serif",
    headingWeight: 400,
    dishWeight: 600,
    numWeight: 400,
    priceWeight: 700,
    fontScale: 1.12,
    tracking: 0.8,
    eyebrowCase: "uppercase",
    eyebrowSpacing: 2,
    dishCase: "uppercase",
    radius: 2,
    borderWidth: 1,
    rule: 3,
    photoMode: "thumb",
    badgeShape: "block",
    navStyle: "solid",
    numbers: false,
    saturationCap: 0.15,
    paper: "#EFE5D4",
    rowPad: 10,
    tone: { bgMix: 8, inkMix: 30, hairMix: 20, tintMix: 20, mutedMix: 46 },
  },
};
