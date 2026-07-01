import { converter } from "culori";

import { TEMPLATES } from "./presets";

import type { QmTemplateName, QmToneMix } from "./presets";

const toOklch = converter("oklch");

const DEFAULT_PRIMARY = "#26201B";
const DEFAULT_SECONDARY = "#7E8C5A";
const DARK_INK = "#16110D";
const WHITE = "#FFFFFF";
const ON_COLOR_LIGHTNESS_THRESHOLD = 0.62;
/** `--qm-emph-ink` mix percent of secondary over ink — fixed, not template-tunable. */
const EMPH_INK_MIX = 82;

export interface QmThemeConfig {
  template: QmTemplateName;
  /** Tenant's first brand color. Falls back to a neutral dark if omitted. */
  primary?: string;
  /** Tenant's second brand color. Falls back to a neutral sage if omitted. */
  secondary?: string;
  paper?: string;
  onPrimary?: string;
  onSecondary?: string;
  /** Overrides the template's OKLCH chroma cap. `null` disables clamping entirely. */
  saturationCap?: number | null;
  tone?: Partial<QmToneMix>;
}

export interface QmDerivedColors {
  primary: string;
  secondary: string;
  paper: string;
  bg: string;
  card: string;
  ink: string;
  muted: string;
  hairline: string;
  tint: string;
  emph: string;
  emphInk: string;
  price: string;
  onPrimary: string;
  onSecondary: string;
  saturationCap: number | null;
}

/** Builds a `color-mix(in oklab, ...)` CSS string — used across the whole theme engine. */
export function mix(a: string, percent: number, b: string): string {
  return `color-mix(in oklab, ${a} ${percent}%, ${b})`;
}

/** Clamps a tenant hex color's OKLCH chroma to `cap` and re-serializes as `oklch(...)`. */
function clampChroma(hex: string, cap: number | null): string {
  const parsed = toOklch(hex);
  if (!parsed) return hex;
  const chroma = cap === null || cap === undefined ? parsed.c : Math.min(parsed.c, cap);
  const hue = parsed.h ?? 0;
  return `oklch(${parsed.l.toFixed(4)} ${chroma.toFixed(4)} ${hue.toFixed(2)})`;
}

/** Picks a readable on-color for a raw (unclamped) tenant color by OKLCH lightness. */
function onColor(hex: string): string {
  const parsed = toOklch(hex);
  return parsed && parsed.l > ON_COLOR_LIGHTNESS_THRESHOLD ? DARK_INK : WHITE;
}

/**
 * Governed derivation: a template + 2 tenant colors → the full color group. Mirrors the
 * reference `qmenut-theme.js` engine's `derive()` exactly, including its choice to emit
 * live `color-mix()`/`oklch()` CSS strings instead of pre-resolving to hex.
 */
export function deriveQmTheme(cfg: QmThemeConfig): QmDerivedColors {
  const template = TEMPLATES[cfg.template];
  const cap = cfg.saturationCap !== undefined ? cfg.saturationCap : template.saturationCap;
  const rawPrimary = cfg.primary || DEFAULT_PRIMARY;
  const rawSecondary = cfg.secondary || DEFAULT_SECONDARY;
  const primary = clampChroma(rawPrimary, cap);
  const secondary = clampChroma(rawSecondary, cap);
  const paper = cfg.paper || template.paper;
  const tone = { ...template.tone, ...cfg.tone };

  const bg = mix(primary, tone.bgMix, paper);
  const card = WHITE;
  const ink = mix(primary, tone.inkMix, DARK_INK);
  const muted = mix(ink, tone.mutedMix, bg);
  const hairline = mix(ink, tone.hairMix, bg);
  const tint = mix(secondary, tone.tintMix, WHITE);
  const emph = secondary;
  const emphInk = mix(secondary, EMPH_INK_MIX, ink);

  return {
    primary,
    secondary,
    paper,
    bg,
    card,
    ink,
    muted,
    hairline,
    tint,
    emph,
    emphInk,
    price: emphInk,
    onPrimary: cfg.onPrimary || onColor(rawPrimary),
    onSecondary: cfg.onSecondary || onColor(rawSecondary),
    saturationCap: cap,
  };
}
