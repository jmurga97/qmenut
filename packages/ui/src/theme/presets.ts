import type { QmFontId } from "./font-catalog";
import type { QmThemeTokens } from "./tokens";

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

export type QmTemplateLayoutDefaults = Pick<
  QmThemeTokens,
  | "--qm-category-active-bg"
  | "--qm-category-active-border"
  | "--qm-category-active-color"
  | "--qm-category-bg"
  | "--qm-category-border"
  | "--qm-category-gap"
  | "--qm-category-radius"
  | "--qm-category-separator"
  | "--qm-content-bottom"
  | "--qm-content-top"
  | "--qm-featured-bg"
  | "--qm-featured-body-pad"
  | "--qm-featured-border"
  | "--qm-featured-cap"
  | "--qm-featured-name-size"
  | "--qm-featured-radius"
  | "--qm-header-pad-top"
  | "--qm-header-pad-x"
  | "--qm-header-title-size"
  | "--qm-hero-logo-radius"
  | "--qm-hero-name-size"
  | "--qm-hero-scrim"
  | "--qm-list-gap"
  | "--qm-modal-pad-x"
  | "--qm-nav-icon-display"
  | "--qm-promo-body-pad"
  | "--qm-promo-discount-width"
  | "--qm-row-bg"
  | "--qm-row-border"
  | "--qm-row-name-size"
  | "--qm-row-pad-x"
  | "--qm-row-photo-radius"
  | "--qm-row-price-size"
  | "--qm-row-radius"
  | "--qm-row-shadow"
  | "--qm-row-stack-gap"
  | "--qm-section-bg"
  | "--qm-section-border"
  | "--qm-section-divider"
  | "--qm-section-gap"
  | "--qm-section-ink"
  | "--qm-section-muted"
  | "--qm-section-pad"
  | "--qm-section-radius"
  | "--qm-section-rail"
  | "--qm-sheet-min"
  | "--qm-sheet-photo-radius"
  | "--qm-sheet-radius"
  | "--qm-shell-pad-x"
  | "--qm-surface-radius"
  | "--qm-surface-shadow"
>;

export interface QmTemplatePreset {
  label: string;
  /** Concrete layout defaults owned by this template and applied directly as CSS tokens. */
  layout: QmTemplateLayoutDefaults;
  heading: string;
  body: string;
  /** Catalog ids used to load the preset's heading and body faces. */
  headingFontId: QmFontId;
  bodyFontId: QmFontId;
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
    layout: {
      "--qm-shell-pad-x": "24px",
      "--qm-content-top": "20px",
      "--qm-content-bottom": "32px",
      "--qm-section-gap": "36px",
      "--qm-list-gap": "20px",
      "--qm-header-pad-x": "24px",
      "--qm-header-pad-top": "24px",
      "--qm-header-title-size": "34px",
      "--qm-hero-scrim": "linear-gradient(180deg, rgba(15,11,8,.08), rgba(15,11,8,.62))",
      "--qm-hero-name-size": "22px",
      "--qm-hero-logo-radius": "0px",
      "--qm-section-bg": "transparent",
      "--qm-section-ink": "var(--qm-ink)",
      "--qm-section-muted": "var(--qm-muted)",
      "--qm-section-pad": "0px",
      "--qm-section-radius": "0px",
      "--qm-section-border": "none",
      "--qm-section-divider": "none",
      "--qm-section-rail": "none",
      "--qm-row-bg": "transparent",
      "--qm-row-border": "1px solid var(--qm-hairline)",
      "--qm-row-radius": "0px",
      "--qm-row-pad-x": "0px",
      "--qm-row-shadow": "none",
      "--qm-row-stack-gap": "0px",
      "--qm-row-name-size": "16px",
      "--qm-row-price-size": "17px",
      "--qm-row-photo-radius": "0px",
      "--qm-featured-bg": "transparent",
      "--qm-featured-border": "none",
      "--qm-featured-cap": "none",
      "--qm-featured-radius": "0px",
      "--qm-featured-body-pad": "0px",
      "--qm-featured-name-size": "21px",
      "--qm-promo-discount-width": "54px",
      "--qm-promo-body-pad": "16px 0 16px 18px",
      "--qm-surface-radius": "0px",
      "--qm-surface-shadow": "none",
      "--qm-sheet-radius": "0px",
      "--qm-sheet-photo-radius": "0px",
      "--qm-sheet-min": "min(360px, 42dvh)",
      "--qm-modal-pad-x": "24px",
      "--qm-category-radius": "0px",
      "--qm-category-bg": "transparent",
      "--qm-category-border": "none",
      "--qm-category-gap": "0px",
      "--qm-category-separator": "1px solid var(--qm-hairline)",
      "--qm-category-active-bg": "transparent",
      "--qm-category-active-color": "var(--qm-ink)",
      "--qm-category-active-border": "none",
      "--qm-nav-icon-display": "none",
    },
    heading: "'Cormorant Garamond',serif",
    body: "'Jost',sans-serif",
    headingFontId: "cormorant-garamond",
    bodyFontId: "jost",
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
    layout: {
      "--qm-shell-pad-x": "18px",
      "--qm-content-top": "16px",
      "--qm-content-bottom": "28px",
      "--qm-section-gap": "28px",
      "--qm-list-gap": "16px",
      "--qm-header-pad-x": "20px",
      "--qm-header-pad-top": "22px",
      "--qm-header-title-size": "32px",
      "--qm-hero-scrim": "linear-gradient(180deg, rgba(25,16,10,.08), rgba(25,16,10,.66))",
      "--qm-hero-name-size": "22px",
      "--qm-hero-logo-radius": "3px",
      "--qm-section-bg": "transparent",
      "--qm-section-ink": "var(--qm-ink)",
      "--qm-section-muted": "var(--qm-emph-ink)",
      "--qm-section-pad": "12px 14px",
      "--qm-section-radius": "3px",
      "--qm-section-border": "1px solid var(--qm-hairline)",
      "--qm-section-divider": "var(--qm-rule) solid var(--qm-section-ink)",
      "--qm-section-rail": "6px solid var(--qm-secondary)",
      "--qm-row-bg": "var(--qm-card)",
      "--qm-row-border": "1px solid var(--qm-hairline)",
      "--qm-row-radius": "3px",
      "--qm-row-pad-x": "10px",
      "--qm-row-shadow": "none",
      "--qm-row-stack-gap": "8px",
      "--qm-row-name-size": "15px",
      "--qm-row-price-size": "17px",
      "--qm-row-photo-radius": "1px",
      "--qm-featured-bg": "var(--qm-card)",
      "--qm-featured-border": "1px solid var(--qm-ink)",
      "--qm-featured-cap": "5px solid var(--qm-secondary)",
      "--qm-featured-radius": "3px",
      "--qm-featured-body-pad": "16px",
      "--qm-featured-name-size": "19px",
      "--qm-promo-discount-width": "72px",
      "--qm-promo-body-pad": "14px 16px",
      "--qm-surface-radius": "3px",
      "--qm-surface-shadow": "none",
      "--qm-sheet-radius": "18px",
      "--qm-sheet-photo-radius": "0px",
      "--qm-sheet-min": "0px",
      "--qm-modal-pad-x": "20px",
      "--qm-category-radius": "3px",
      "--qm-category-bg": "var(--qm-card)",
      "--qm-category-border": "1px solid var(--qm-hairline)",
      "--qm-category-gap": "8px",
      "--qm-category-separator": "none",
      "--qm-category-active-bg": "var(--qm-secondary)",
      "--qm-category-active-color": "var(--qm-on-secondary)",
      "--qm-category-active-border": "1px solid transparent",
      "--qm-nav-icon-display": "inline-flex",
    },
    heading: "'Yeseva One',serif",
    body: "'Spectral',serif",
    headingFontId: "yeseva-one",
    bodyFontId: "spectral",
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
    layout: {
      "--qm-shell-pad-x": "12px",
      "--qm-content-top": "12px",
      "--qm-content-bottom": "24px",
      "--qm-section-gap": "20px",
      "--qm-list-gap": "12px",
      "--qm-header-pad-x": "16px",
      "--qm-header-pad-top": "18px",
      "--qm-header-title-size": "38px",
      "--qm-hero-scrim": "linear-gradient(180deg, rgba(10,9,8,.04), rgba(10,9,8,.78))",
      "--qm-hero-name-size": "26px",
      "--qm-hero-logo-radius": "10px",
      "--qm-section-bg": "var(--qm-primary)",
      "--qm-section-ink": "var(--qm-on-primary)",
      "--qm-section-muted": "color-mix(in oklab, var(--qm-on-primary) 72%, var(--qm-primary))",
      "--qm-section-pad": "12px 14px",
      "--qm-section-radius": "12px",
      "--qm-section-border": "none",
      "--qm-section-divider": "var(--qm-rule) solid var(--qm-section-ink)",
      "--qm-section-rail": "6px solid var(--qm-secondary)",
      "--qm-row-bg": "var(--qm-card)",
      "--qm-row-border": "none",
      "--qm-row-radius": "14px",
      "--qm-row-pad-x": "12px",
      "--qm-row-shadow": "0 8px 22px rgba(28,24,21,.09)",
      "--qm-row-stack-gap": "10px",
      "--qm-row-name-size": "17px",
      "--qm-row-price-size": "20px",
      "--qm-row-photo-radius": "10px",
      "--qm-featured-bg": "var(--qm-card)",
      "--qm-featured-border": "none",
      "--qm-featured-cap": "6px solid var(--qm-secondary)",
      "--qm-featured-radius": "18px",
      "--qm-featured-body-pad": "16px",
      "--qm-featured-name-size": "24px",
      "--qm-promo-discount-width": "86px",
      "--qm-promo-body-pad": "16px",
      "--qm-surface-radius": "16px",
      "--qm-surface-shadow": "0 12px 30px rgba(28,24,21,.10)",
      "--qm-sheet-radius": "24px",
      "--qm-sheet-photo-radius": "18px",
      "--qm-sheet-min": "0px",
      "--qm-modal-pad-x": "20px",
      "--qm-category-radius": "999px",
      "--qm-category-bg": "var(--qm-card)",
      "--qm-category-border": "1px solid var(--qm-hairline)",
      "--qm-category-gap": "8px",
      "--qm-category-separator": "none",
      "--qm-category-active-bg": "var(--qm-primary)",
      "--qm-category-active-color": "var(--qm-on-primary)",
      "--qm-category-active-border": "1px solid transparent",
      "--qm-nav-icon-display": "inline-flex",
    },
    heading: "'Anton',sans-serif",
    body: "'Barlow',sans-serif",
    headingFontId: "anton",
    bodyFontId: "barlow",
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
    layout: {
      "--qm-shell-pad-x": "18px",
      "--qm-content-top": "18px",
      "--qm-content-bottom": "30px",
      "--qm-section-gap": "30px",
      "--qm-list-gap": "16px",
      "--qm-header-pad-x": "20px",
      "--qm-header-pad-top": "20px",
      "--qm-header-title-size": "31px",
      "--qm-hero-scrim": "linear-gradient(180deg, rgba(30,22,16,.04), rgba(30,22,16,.56))",
      "--qm-hero-name-size": "22px",
      "--qm-hero-logo-radius": "50%",
      "--qm-section-bg": "transparent",
      "--qm-section-ink": "var(--qm-ink)",
      "--qm-section-muted": "var(--qm-muted)",
      "--qm-section-pad": "0 0 10px",
      "--qm-section-radius": "0px",
      "--qm-section-border": "none",
      "--qm-section-divider": "var(--qm-rule) solid var(--qm-section-ink)",
      "--qm-section-rail": "none",
      "--qm-row-bg": "transparent",
      "--qm-row-border": "none",
      "--qm-row-radius": "18px",
      "--qm-row-pad-x": "0px",
      "--qm-row-shadow": "none",
      "--qm-row-stack-gap": "0px",
      "--qm-row-name-size": "15px",
      "--qm-row-price-size": "17px",
      "--qm-row-photo-radius": "50%",
      "--qm-featured-bg": "var(--qm-card)",
      "--qm-featured-border": "1px solid var(--qm-hairline)",
      "--qm-featured-cap": "none",
      "--qm-featured-radius": "22px",
      "--qm-featured-body-pad": "18px",
      "--qm-featured-name-size": "18px",
      "--qm-promo-discount-width": "64px",
      "--qm-promo-body-pad": "14px 16px",
      "--qm-surface-radius": "20px",
      "--qm-surface-shadow": "0 8px 24px rgba(54,43,34,.07)",
      "--qm-sheet-radius": "26px",
      "--qm-sheet-photo-radius": "20px",
      "--qm-sheet-min": "0px",
      "--qm-modal-pad-x": "20px",
      "--qm-category-radius": "999px",
      "--qm-category-bg": "var(--qm-card)",
      "--qm-category-border": "1px solid var(--qm-hairline)",
      "--qm-category-gap": "8px",
      "--qm-category-separator": "none",
      "--qm-category-active-bg": "var(--qm-tint)",
      "--qm-category-active-color": "var(--qm-emph-ink)",
      "--qm-category-active-border": "1px solid transparent",
      "--qm-nav-icon-display": "inline-flex",
    },
    heading: "'Quicksand',sans-serif",
    body: "'Nunito Sans',sans-serif",
    headingFontId: "quicksand",
    bodyFontId: "nunito-sans",
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
    layout: {
      "--qm-shell-pad-x": "18px",
      "--qm-content-top": "14px",
      "--qm-content-bottom": "24px",
      "--qm-section-gap": "20px",
      "--qm-list-gap": "12px",
      "--qm-header-pad-x": "20px",
      "--qm-header-pad-top": "20px",
      "--qm-header-title-size": "32px",
      "--qm-hero-scrim": "linear-gradient(180deg, rgba(20,12,8,.06), rgba(20,12,8,.70))",
      "--qm-hero-name-size": "24px",
      "--qm-hero-logo-radius": "2px",
      "--qm-section-bg": "transparent",
      "--qm-section-ink": "var(--qm-ink)",
      "--qm-section-muted": "var(--qm-muted)",
      "--qm-section-pad": "0 0 9px 12px",
      "--qm-section-radius": "0px",
      "--qm-section-border": "none",
      "--qm-section-divider": "var(--qm-rule) solid var(--qm-section-ink)",
      "--qm-section-rail": "4px solid var(--qm-primary)",
      "--qm-row-bg": "transparent",
      "--qm-row-border": "1px solid var(--qm-hairline)",
      "--qm-row-radius": "0px",
      "--qm-row-pad-x": "0px",
      "--qm-row-shadow": "none",
      "--qm-row-stack-gap": "0px",
      "--qm-row-name-size": "16px",
      "--qm-row-price-size": "19px",
      "--qm-row-photo-radius": "2px",
      "--qm-featured-bg": "var(--qm-card)",
      "--qm-featured-border": "1px solid var(--qm-hairline)",
      "--qm-featured-cap": "3px solid var(--qm-primary)",
      "--qm-featured-radius": "0px",
      "--qm-featured-body-pad": "14px 16px",
      "--qm-featured-name-size": "18px",
      "--qm-promo-discount-width": "72px",
      "--qm-promo-body-pad": "13px 15px",
      "--qm-surface-radius": "2px",
      "--qm-surface-shadow": "none",
      "--qm-sheet-radius": "12px",
      "--qm-sheet-photo-radius": "2px",
      "--qm-sheet-min": "0px",
      "--qm-modal-pad-x": "20px",
      "--qm-category-radius": "2px",
      "--qm-category-bg": "var(--qm-card)",
      "--qm-category-border": "1px solid var(--qm-hairline)",
      "--qm-category-gap": "8px",
      "--qm-category-separator": "none",
      "--qm-category-active-bg": "var(--qm-primary)",
      "--qm-category-active-color": "var(--qm-on-primary)",
      "--qm-category-active-border": "1px solid transparent",
      "--qm-nav-icon-display": "inline-flex",
    },
    heading: "'Bebas Neue',sans-serif",
    body: "'Work Sans',sans-serif",
    headingFontId: "bebas-neue",
    bodyFontId: "work-sans",
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
