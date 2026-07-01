import { deriveQmTheme, mix } from "./derive";
import { ARCHETYPES } from "./presets";

import type { QmDerivedColors, QmThemeConfig } from "./derive";
import type { QmArchetypePreset, QmBadgeShape, QmNavStyle, QmPhotoMode } from "./presets";

/**
 * Tenant input: an archetype name + color overrides (`QmThemeConfig`), plus optional
 * per-tenant overrides of any archetype default (typography, geometry, photo/badge/nav
 * mode). Anything omitted falls back to the archetype preset.
 */
export type QmThemeInput = QmThemeConfig & Partial<Omit<QmArchetypePreset, "tone" | "saturationCap" | "paper">>;

const PHOTO_GROUPS: Record<QmPhotoMode, Record<string, string>> = {
  none: {
    "--qm-photo": "none",
    "--qm-dish-photo": "none",
    "--qm-featured-img": "none",
    "--qm-featured-dir": "row",
    "--qm-item-dir": "row",
    "--qm-item-align": "baseline",
    "--qm-row-gap": "17px",
    "--qm-promo-img": "none",
  },
  thumb: {
    "--qm-photo": "block",
    "--qm-dish-photo": "block",
    "--qm-dish-pw": "56px",
    "--qm-dish-ph": "56px",
    "--qm-featured-img": "block",
    "--qm-featured-dir": "row",
    "--qm-featured-iw": "88px",
    "--qm-featured-ih": "88px",
    "--qm-featured-img-order": "2",
    "--qm-item-dir": "row",
    "--qm-item-align": "center",
    "--qm-row-gap": "13px",
    "--qm-promo-img": "block",
  },
  hero: {
    "--qm-photo": "block",
    "--qm-dish-photo": "block",
    "--qm-dish-pw": "62px",
    "--qm-dish-ph": "62px",
    "--qm-featured-img": "block",
    "--qm-featured-dir": "column",
    "--qm-featured-iw": "100%",
    "--qm-featured-ih": "128px",
    "--qm-featured-img-order": "0",
    "--qm-item-dir": "row",
    "--qm-item-align": "center",
    "--qm-row-gap": "14px",
    "--qm-hero-h": "168px",
    "--qm-promo-img": "block",
  },
  heroxl: {
    "--qm-photo": "block",
    "--qm-dish-photo": "block",
    "--qm-dish-pw": "74px",
    "--qm-dish-ph": "74px",
    "--qm-featured-img": "block",
    "--qm-featured-dir": "column",
    "--qm-featured-iw": "100%",
    "--qm-featured-ih": "150px",
    "--qm-featured-img-order": "0",
    "--qm-item-dir": "row",
    "--qm-item-align": "center",
    "--qm-row-gap": "16px",
    "--qm-hero-h": "196px",
    "--qm-promo-img": "block",
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
      "--qm-nav-active-color": colors.emphInk,
      "--qm-nav-active-bd": `2px solid ${colors.emph}`,
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
      "--qm-nav-active-bg": mix(colors.emph, 16, "#FFFFFF"),
      "--qm-nav-active-color": colors.emphInk,
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

/** Archetype preset with any tenant-supplied field (typography/geometry/mode) overlaid. */
function resolveArchetype(input: QmThemeInput): QmArchetypePreset {
  const archetype = ARCHETYPES[input.archetype];
  return {
    label: input.label ?? archetype.label,
    heading: input.heading ?? archetype.heading,
    body: input.body ?? archetype.body,
    headingWeight: input.headingWeight ?? archetype.headingWeight,
    dishWeight: input.dishWeight ?? archetype.dishWeight,
    fontScale: input.fontScale ?? archetype.fontScale,
    tracking: input.tracking ?? archetype.tracking,
    eyebrowCase: input.eyebrowCase ?? archetype.eyebrowCase,
    eyebrowSpacing: input.eyebrowSpacing ?? archetype.eyebrowSpacing,
    radius: input.radius ?? archetype.radius,
    borderWidth: input.borderWidth ?? archetype.borderWidth,
    rule: input.rule ?? archetype.rule,
    photoMode: input.photoMode ?? archetype.photoMode,
    badgeShape: input.badgeShape ?? archetype.badgeShape,
    navStyle: input.navStyle ?? archetype.navStyle,
    numbers: input.numbers ?? archetype.numbers,
    saturationCap: archetype.saturationCap,
    paper: archetype.paper,
    cardShadow: input.cardShadow ?? archetype.cardShadow,
    rowPad: input.rowPad ?? archetype.rowPad,
    tone: archetype.tone,
  };
}

/**
 * Builds the full `--qm-*` variable map for a tenant: archetype defaults + tenant color
 * derivation (`deriveQmTheme`) + the photo/badge/nav group expansions. Pure function — no
 * DOM access — so it can also be used to preview or diff a theme before applying it.
 */
export function buildQmThemeVars(input: QmThemeInput): Record<string, string> {
  const resolved = resolveArchetype(input);
  const colors = deriveQmTheme(input);
  const hasDivider = resolved.photoMode === "none" || resolved.photoMode === "thumb";

  return {
    "--qm-primary": colors.primary,
    "--qm-secondary": colors.secondary,
    "--qm-emph": colors.emph,
    "--qm-emph-ink": colors.emphInk,
    "--qm-bg": colors.bg,
    "--qm-card": colors.card,
    "--qm-ink": colors.ink,
    "--qm-muted": colors.muted,
    "--qm-hairline": colors.hairline,
    "--qm-on-primary": colors.onPrimary,
    "--qm-on-secondary": colors.onSecondary,
    "--qm-tint": colors.tint,
    "--qm-price": colors.price,

    "--qm-heading": resolved.heading,
    "--qm-body": resolved.body,
    "--qm-hw": String(resolved.headingWeight),
    "--qm-dish-weight": String(resolved.dishWeight),
    "--qm-fs": String(resolved.fontScale),
    "--qm-name-ls": `${resolved.tracking}px`,
    "--qm-eyebrow-tt": resolved.eyebrowCase,
    "--qm-eyebrow-ls": `${resolved.eyebrowSpacing}px`,

    "--qm-radius": `${resolved.radius}px`,
    "--qm-bw": `${resolved.borderWidth}px`,
    "--qm-rule": `${resolved.rule}px`,
    "--qm-num": resolved.numbers ? "inline" : "none",
    // 13px for every archetype except tapas (10px), independent of --qm-divider — matches
    // the token spec table, not the demo prototype's divider-conditional row-pad.
    "--qm-row-pad": `${resolved.rowPad ?? 13}px`,
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
