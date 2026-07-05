/**
 * The full `--qm-*` CSS custom property contract. Every QMenut Lit component reads its
 * visual values exclusively from these variables (set at runtime via `applyQmTheme`) —
 * components never hardcode colors, fonts, or geometry.
 *
 * Every field is typed `string` because that's what a CSS custom property actually is at
 * runtime: `style.setProperty` only accepts strings, and `var(--foo)` only ever yields a
 * string to the CSS engine — including the numeric-looking ones like `--qm-hw` ("600") or
 * `--qm-fs` ("1").
 *
 * Color tokens are CSS color expressions, not resolved hex: `--qm-primary`/`--qm-secondary`
 * are chroma-clamped `oklch(...)` strings, and everything mixed from them (`--qm-bg`,
 * `--qm-ink`, `--qm-muted`, `--qm-hairline`, `--qm-tint`, `--qm-emph-ink`) is a
 * `color-mix(in oklab, ...)` string — the browser resolves the actual paint color, matching
 * `theme/derive.ts`.
 *
 * The photography, badge, and navigation groups below are *expansions*: a single
 * `photoMode` / `badgeShape` / `navStyle` choice on a `QmTemplatePreset` (see
 * `theme/presets.ts`) fans out into the concrete tokens components actually consume, via
 * `theme/apply-theme.ts`.
 */
export interface QmThemeTokens {
  // Typography
  "--qm-heading": string;
  "--qm-body": string;
  "--qm-hw": string;
  "--qm-dish-weight": string;
  "--qm-num-weight": string;
  "--qm-price-weight": string;
  "--qm-fs": string;
  "--qm-name-ls": string;
  "--qm-eyebrow-tt": "uppercase" | "none";
  "--qm-eyebrow-ls": string;

  // Geometry
  "--qm-radius": string;
  "--qm-bw": string;
  "--qm-rule": string;
  "--qm-num": "inline" | "none";
  "--qm-row-pad": string;
  "--qm-row-gap": string;
  "--qm-card-shadow": string;
  "--qm-ph": string;
  "--qm-divider": string;
  "--qm-divider2": string;

  // Color — see the file docstring: `oklch()`/`color-mix()` CSS expressions, not hex.
  "--qm-primary": string;
  "--qm-secondary": string;
  "--qm-emph": string;
  "--qm-emph-ink": string;
  // Structural accent = the tenant's primary (numbers, rules, nav/hero accents, logo).
  "--qm-accent": string;
  "--qm-accent-ink": string;
  "--qm-on-accent": string;
  "--qm-bg": string;
  "--qm-card": string;
  "--qm-ink": string;
  "--qm-muted": string;
  "--qm-hairline": string;
  "--qm-on-primary": string;
  "--qm-on-secondary": string;
  "--qm-tint": string;
  "--qm-price": string;
  "--qm-fill": string;

  // Photography — expanded from `photoMode` (`none | thumb | hero | heroxl`).
  "--qm-photo": "block" | "none";
  "--qm-dish-photo": "block" | "none";
  "--qm-dish-pw": string;
  "--qm-dish-ph": string;
  "--qm-featured-img": "block" | "none";
  "--qm-featured-dir": "row" | "column";
  "--qm-featured-iw": string;
  "--qm-featured-ih": string;
  "--qm-featured-img-order": string;
  "--qm-item-dir": "row" | "column";
  "--qm-item-align": "baseline" | "center";
  "--qm-promo-img": "block" | "none";
  "--qm-hero-h"?: string;
  "--qm-modal-photo-h"?: string;
  "--qm-modal-order-photo": string;
  "--qm-modal-order-desc": string;
  "--qm-modal-order-extras": string;
  "--qm-modal-order-allergens": string;

  // Badges — expanded from `badgeShape` (`outline | block | pill`).
  "--qm-badge-bg": string;
  "--qm-badge-color": string;
  "--qm-badge-bd": string;
  "--qm-badge-radius": string;
  "--qm-badge-weight": string;

  // Dish tags (veggie / picante etc.) — derived alongside the badge group.
  "--qm-tag-bg": string;
  "--qm-tag-color": string;
  "--qm-tag-bd": string;

  // Navigation — expanded from `navStyle` (`bar | floating | solid`). `-active-*` and
  // `-muted` are generic state tokens: a nav item component applies `-active-*` when its
  // `active` prop is true, and `-muted`/transparent otherwise.
  "--qm-nav-m": string;
  "--qm-nav-radius": string;
  "--qm-nav-bg": string;
  "--qm-nav-bt": string;
  "--qm-nav-shadow": string;
  "--qm-nav-backdrop": string;
  "--qm-nav-active-bg": string;
  "--qm-nav-active-color": string;
  "--qm-nav-active-bd": string;
  "--qm-nav-active-radius": string;
  "--qm-nav-active-pad": string;
  "--qm-nav-muted": string;
}
