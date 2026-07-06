import { deriveQmTheme, mix } from "./derive";
import { getFontStack } from "./font-catalog";
import { TEMPLATES } from "./presets";

import type { QmDerivedColors, QmThemeConfig } from "./derive";
import type { QmFontId } from "./font-catalog";
import type { QmBadgeShape, QmNavStyle, QmPhotoMode, QmTemplatePreset } from "./presets";

/**
 * Tenant input: a template name + color overrides (`QmThemeConfig`), plus optional
 * per-tenant overrides of any template default (typography, geometry, photo/badge/nav
 * mode) and optional font-catalog picks. Anything omitted falls back to the template preset.
 */
export type QmThemeInput = QmThemeConfig &
  Partial<Omit<QmTemplatePreset, "tone" | "saturationCap" | "paper">> & {
    headingFont?: QmFontId;
    bodyFont?: QmFontId;
  };

const PHOTO_GROUPS: Record<QmPhotoMode, Record<string, string>> = {
  none: {
    "--qm-photo": "none",
    "--qm-dish-photo": "none",
    "--qm-featured-img": "none",
    "--qm-featured-dir": "row",
    "--qm-item-dir": "row",
    "--qm-item-align": "baseline",
    "--qm-row-gap": "14px",
    "--qm-promo-img": "none",
    "--qm-modal-order-photo": "0",
    "--qm-modal-order-desc": "0",
    "--qm-modal-order-extras": "1",
    "--qm-modal-order-allergens": "2",
  },
  thumb: {
    "--qm-photo": "block",
    "--qm-dish-photo": "block",
    "--qm-dish-pw": "52px",
    "--qm-dish-ph": "52px",
    "--qm-featured-img": "block",
    "--qm-featured-dir": "row",
    "--qm-featured-iw": "94px",
    // `auto` + the featured photo's `align-self: stretch` makes the thumb-mode image a
    // full-height band instead of a floating square, filling the dead whitespace.
    "--qm-featured-ih": "auto",
    "--qm-featured-img-order": "2",
    "--qm-item-dir": "row",
    "--qm-item-align": "center",
    "--qm-row-gap": "11px",
    "--qm-promo-img": "block",
    "--qm-modal-photo-h": "140px",
    "--qm-modal-order-photo": "0",
    "--qm-modal-order-desc": "1",
    "--qm-modal-order-extras": "2",
    "--qm-modal-order-allergens": "3",
  },
  hero: {
    "--qm-photo": "block",
    "--qm-dish-photo": "block",
    "--qm-dish-pw": "54px",
    "--qm-dish-ph": "54px",
    "--qm-featured-img": "block",
    "--qm-featured-dir": "column",
    "--qm-featured-iw": "100%",
    "--qm-featured-ih": "116px",
    "--qm-featured-img-order": "0",
    "--qm-item-dir": "row",
    "--qm-item-align": "center",
    "--qm-row-gap": "11px",
    "--qm-hero-h": "148px",
    "--qm-promo-img": "block",
    "--qm-modal-photo-h": "200px",
    "--qm-modal-order-photo": "0",
    "--qm-modal-order-desc": "1",
    "--qm-modal-order-extras": "2",
    "--qm-modal-order-allergens": "3",
  },
  heroxl: {
    "--qm-photo": "block",
    "--qm-dish-photo": "block",
    "--qm-dish-pw": "60px",
    "--qm-dish-ph": "60px",
    "--qm-featured-img": "block",
    "--qm-featured-dir": "column",
    "--qm-featured-iw": "100%",
    "--qm-featured-ih": "132px",
    "--qm-featured-img-order": "0",
    "--qm-item-dir": "row",
    "--qm-item-align": "center",
    "--qm-row-gap": "12px",
    "--qm-hero-h": "166px",
    "--qm-promo-img": "block",
    "--qm-modal-photo-h": "280px",
    "--qm-modal-order-photo": "0",
    "--qm-modal-order-desc": "1",
    "--qm-modal-order-extras": "2",
    "--qm-modal-order-allergens": "3",
  },
};

interface BuildBadgeTokensArgs {
  shape: QmBadgeShape;
  colors: QmDerivedColors;
  radius: string;
}

function buildBadgeTokens({ shape, colors, radius }: BuildBadgeTokensArgs): Record<string, string> {
  const badgeByShape: Record<QmBadgeShape, Record<string, string>> = {
    outline: {
      "--qm-badge-bg": "transparent",
      "--qm-badge-color": colors.ink,
      "--qm-badge-bd": `1px solid ${colors.ink}`,
      "--qm-badge-radius": radius,
      "--qm-badge-weight": "700",
    },
    block: {
      "--qm-badge-bg": colors.secondary,
      "--qm-badge-color": colors.onSecondary,
      "--qm-badge-bd": "none",
      "--qm-badge-radius": radius,
      "--qm-badge-weight": "800",
    },
    pill: {
      "--qm-badge-bg": colors.tint,
      "--qm-badge-color": mix(colors.secondary, 78, colors.ink),
      "--qm-badge-bd": "none",
      "--qm-badge-radius": "20px",
      "--qm-badge-weight": "700",
    },
  };

  const tagTokens =
    shape === "block"
      ? {
          "--qm-tag-bg": colors.secondary,
          "--qm-tag-color": colors.onSecondary,
          "--qm-tag-bd": "none",
        }
      : {
          "--qm-tag-bg": colors.tint,
          "--qm-tag-color": mix(colors.secondary, 80, colors.ink),
          "--qm-tag-bd": shape === "outline" ? `1px solid ${mix(colors.secondary, 55, colors.bg)}` : "none",
        };

  return { ...badgeByShape[shape], ...tagTokens };
}

interface BuildNavTokensArgs {
  navStyle: QmNavStyle;
  colors: QmDerivedColors;
  rule: string;
}

function buildNavTokens({ navStyle, colors, rule }: BuildNavTokensArgs): Record<string, string> {
  const navByStyle: Record<QmNavStyle, Record<string, string>> = {
    bar: {
      "--qm-nav-m": "0px",
      "--qm-nav-radius": "0px",
      "--qm-nav-bg": colors.card,
      "--qm-nav-bt": `${rule} solid ${colors.ink}`,
      "--qm-nav-shadow": "none",
      "--qm-nav-backdrop": "none",
      "--qm-nav-active-bg": "transparent",
      "--qm-nav-active-color": colors.accentInk,
      "--qm-nav-active-bd": `2px solid ${colors.accent}`,
      "--qm-nav-active-radius": "0px",
      "--qm-nav-active-pad": "6px 10px",
      "--qm-nav-muted": colors.muted,
    },
    floating: {
      "--qm-nav-m": "12px",
      "--qm-nav-radius": "22px",
      "--qm-nav-bg": mix(colors.card, 78, "transparent"),
      "--qm-nav-bt": `1px solid ${mix("#FFFFFF", 55, "transparent")}`,
      "--qm-nav-shadow": "0 14px 32px rgba(40,30,20,.20)",
      "--qm-nav-backdrop": "blur(20px) saturate(180%)",
      "--qm-nav-active-bg": mix(colors.accent, 16, "#FFFFFF"),
      "--qm-nav-active-color": colors.accentInk,
      "--qm-nav-active-bd": "none",
      "--qm-nav-active-radius": "15px",
      "--qm-nav-active-pad": "8px 13px",
      "--qm-nav-muted": colors.muted,
    },
    solid: {
      "--qm-nav-m": "0px",
      "--qm-nav-radius": "0px",
      "--qm-nav-bg": colors.primary,
      "--qm-nav-bt": "none",
      "--qm-nav-shadow": "none",
      "--qm-nav-backdrop": "none",
      "--qm-nav-active-bg": "transparent",
      "--qm-nav-active-color": colors.onPrimary,
      "--qm-nav-active-bd": `2px solid ${colors.onPrimary}`,
      "--qm-nav-active-radius": "0px",
      "--qm-nav-active-pad": "6px 12px",
      "--qm-nav-muted": mix(colors.onPrimary, 50, colors.primary),
    },
  };
  return navByStyle[navStyle];
}

/** Template preset with any tenant-supplied field (typography/geometry/mode) overlaid. */
function resolveTemplate(input: QmThemeInput): QmTemplatePreset {
  const template = TEMPLATES[input.template];
  return {
    label: input.label ?? template.label,
    // Catalog font pick wins, then any raw `heading`/`body` override, then the template preset.
    heading: getFontStack(input.headingFont) ?? input.heading ?? template.heading,
    body: getFontStack(input.bodyFont) ?? input.body ?? template.body,
    headingWeight: input.headingWeight ?? template.headingWeight,
    dishWeight: input.dishWeight ?? template.dishWeight,
    numWeight: input.numWeight ?? template.numWeight,
    priceWeight: input.priceWeight ?? template.priceWeight,
    fontScale: input.fontScale ?? template.fontScale,
    tracking: input.tracking ?? template.tracking,
    eyebrowCase: input.eyebrowCase ?? template.eyebrowCase,
    eyebrowSpacing: input.eyebrowSpacing ?? template.eyebrowSpacing,
    dishCase: input.dishCase ?? template.dishCase,
    radius: input.radius ?? template.radius,
    borderWidth: input.borderWidth ?? template.borderWidth,
    rule: input.rule ?? template.rule,
    photoMode: input.photoMode ?? template.photoMode,
    badgeShape: input.badgeShape ?? template.badgeShape,
    navStyle: input.navStyle ?? template.navStyle,
    numbers: input.numbers ?? template.numbers,
    saturationCap: template.saturationCap,
    paper: template.paper,
    cardShadow: input.cardShadow ?? template.cardShadow,
    rowPad: input.rowPad ?? template.rowPad,
    tone: template.tone,
  };
}

/**
 * Mobile-first type scale, in px at `fontScale: 1`. Emitted pre-multiplied by the
 * template's `fontScale` so component CSS uses `var(--qm-text-*)` directly and never
 * multiplies by `--qm-fs` again. `2xs` keeps a 10px legibility floor.
 */
const TEXT_SCALE = {
  "--qm-text-2xs": 10,
  "--qm-text-xs": 11,
  "--qm-text-sm": 12,
  "--qm-text-md": 13.5,
  "--qm-text-lg": 15,
  "--qm-text-xl": 17,
  "--qm-text-2xl": 22,
  "--qm-text-display": 29,
} as const;

function buildTextScaleTokens(fontScale: number): Record<string, string> {
  const px = (base: number, floor = 0): string => `${Math.max(floor, Math.round(base * fontScale * 10) / 10)}px`;

  return Object.fromEntries(
    Object.entries(TEXT_SCALE).map(([token, base]) => [token, px(base, token === "--qm-text-2xs" ? 10 : 0)]),
  );
}

/**
 * Builds the full `--qm-*` variable map for a tenant: template defaults + tenant color
 * derivation (`deriveQmTheme`) + the photo/badge/nav group expansions. Pure function — no
 * DOM access — so it can also be used to preview or diff a theme before applying it.
 */
export function buildQmThemeVars(input: QmThemeInput): Record<string, string> {
  const resolved = resolveTemplate(input);
  const colors = deriveQmTheme(input);
  const hasDivider = resolved.photoMode === "none" || resolved.photoMode === "thumb";

  return {
    "--qm-primary": colors.primary,
    "--qm-secondary": colors.secondary,
    "--qm-emph": colors.emph,
    "--qm-emph-ink": colors.emphInk,
    "--qm-accent": colors.accent,
    "--qm-accent-ink": colors.accentInk,
    "--qm-on-accent": colors.onPrimary,
    "--qm-bg": colors.bg,
    "--qm-card": colors.card,
    "--qm-ink": colors.ink,
    "--qm-muted": colors.muted,
    "--qm-hairline": colors.hairline,
    "--qm-on-primary": colors.onPrimary,
    "--qm-on-secondary": colors.onSecondary,
    "--qm-tint": colors.tint,
    "--qm-price": colors.price,
    "--qm-fill": mix(colors.ink, 12, "#FFFFFF"),

    "--qm-heading": resolved.heading,
    "--qm-body": resolved.body,
    "--qm-hw": String(resolved.headingWeight),
    "--qm-dish-weight": String(resolved.dishWeight),
    "--qm-num-weight": String(resolved.numWeight),
    "--qm-price-weight": String(resolved.priceWeight),
    "--qm-fs": String(resolved.fontScale),
    "--qm-name-ls": `${resolved.tracking}px`,
    "--qm-eyebrow-tt": resolved.eyebrowCase,
    "--qm-eyebrow-ls": `${resolved.eyebrowSpacing}px`,
    "--qm-dish-tt": resolved.dishCase ?? "none",
    ...buildTextScaleTokens(resolved.fontScale),

    "--qm-radius": `${resolved.radius}px`,
    "--qm-bw": `${resolved.borderWidth}px`,
    "--qm-rule": `${resolved.rule}px`,
    "--qm-num": resolved.numbers ? "inline" : "none",
    // Compact default row rhythm for the mobile-first menu; templates can still override.
    "--qm-row-pad": `${resolved.rowPad ?? 11}px`,
    "--qm-card-shadow": resolved.cardShadow ?? "none",
    "--qm-ph": `repeating-linear-gradient(45deg,${mix(colors.primary, 9, colors.paper)} 0 9px,${mix(colors.primary, 4, colors.paper)} 9px 18px)`,
    "--qm-divider": hasDivider ? `1px solid ${colors.hairline}` : "none",
    "--qm-divider2": `1px solid ${colors.hairline}`,

    ...PHOTO_GROUPS[resolved.photoMode],
    ...buildBadgeTokens({ shape: resolved.badgeShape, colors, radius: `${resolved.radius}px` }),
    ...buildNavTokens({ navStyle: resolved.navStyle, colors, rule: `${resolved.rule}px` }),
  };
}

/** Computes and applies the full theme onto `el` — descendant shadow-DOM components inherit
 *  these custom properties through the CSS cascade. */
export function applyQmTheme(el: HTMLElement, input: QmThemeInput): void {
  const vars = buildQmThemeVars(input);
  for (const [property, value] of Object.entries(vars)) {
    el.style.setProperty(property, value);
  }
}
