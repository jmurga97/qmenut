import { converter } from "culori";

import { TEMPLATES } from "./presets";

import type { QmTemplateName, QmToneMix } from "./presets";

export interface QmColorEngineConfig {
  /** Fallback primary when a tenant omits one. */
  defaultPrimary: string;
  /** Fallback secondary when a tenant omits one. */
  defaultSecondary: string;
  darkInk: string;
  white: string;
  onColorLightnessThreshold: number;
  /** `--qm-emph-ink` mix percent of secondary over ink — fixed, not template-tunable. */
  emphInkMix: number;
}

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
  /** Structural accent = the tenant's primary. Numbers, rules, nav/hero accents draw on this. */
  accent: string;
  /** Legible primary for small structural text (numerals) — mixed toward ink so a vivid brand
   *  color pops while a near-neutral primary reads as tasteful ink. */
  accentInk: string;
  onPrimary: string;
  onSecondary: string;
  saturationCap: number | null;
}

const DEFAULT_CONFIG: QmColorEngineConfig = {
  defaultPrimary: "#26201B",
  defaultSecondary: "#7E8C5A",
  darkInk: "#16110D",
  white: "#FFFFFF",
  onColorLightnessThreshold: 0.62,
  emphInkMix: 82,
};

/**
 * Singleton that owns every color-related concern of the theme engine: the `oklch`
 * converter, the tunable defaults (`configure`), and the `color-mix`/chroma-clamp/on-color
 * primitives used to derive a tenant's full color group. Mirrors the reference
 * `qmenut-theme.js` engine's `derive()` exactly, including its choice to emit live
 * `color-mix()`/`oklch()` CSS strings instead of pre-resolving to hex.
 */
class QmColorEngine {
  private static instance: QmColorEngine | undefined;

  private readonly toOklch = converter("oklch");
  private config: QmColorEngineConfig = { ...DEFAULT_CONFIG };

  private constructor() {}

  static getInstance(): QmColorEngine {
    if (!QmColorEngine.instance) {
      QmColorEngine.instance = new QmColorEngine();
    }
    return QmColorEngine.instance;
  }

  /** Overrides engine-wide defaults (fallback brand colors, on-color threshold, etc). */
  configure(overrides: Partial<QmColorEngineConfig>): void {
    this.config = { ...this.config, ...overrides };
  }

  /** Builds a `color-mix(in oklab, ...)` CSS string — used across the whole theme engine. */
  mix(a: string, percent: number, b: string): string {
    return `color-mix(in oklab, ${a} ${percent}%, ${b})`;
  }

  /** Clamps a tenant hex color's OKLCH chroma to `cap` and re-serializes as `oklch(...)`. */
  clampChroma(hex: string, cap: number | null): string {
    const parsed = this.toOklch(hex);
    if (!parsed) return hex;
    const chroma = cap === null || cap === undefined ? parsed.c : Math.min(parsed.c, cap);
    const hue = parsed.h ?? 0;
    return `oklch(${parsed.l.toFixed(4)} ${chroma.toFixed(4)} ${hue.toFixed(2)})`;
  }

  /** Picks a readable on-color for a raw (unclamped) tenant color by OKLCH lightness. */
  onColor(hex: string): string {
    const parsed = this.toOklch(hex);
    return parsed && parsed.l > this.config.onColorLightnessThreshold ? this.config.darkInk : this.config.white;
  }

  /** Governed derivation: a template + 2 tenant colors → the full color group. */
  derive(cfg: QmThemeConfig): QmDerivedColors {
    const template = TEMPLATES[cfg.template];
    const cap = cfg.saturationCap !== undefined ? cfg.saturationCap : template.saturationCap;
    const rawPrimary = cfg.primary || this.config.defaultPrimary;
    const rawSecondary = cfg.secondary || this.config.defaultSecondary;
    const primary = this.clampChroma(rawPrimary, cap);
    const secondary = this.clampChroma(rawSecondary, cap);
    const paper = cfg.paper || template.paper;
    const tone = { ...template.tone, ...cfg.tone };

    const bg = this.mix(primary, tone.bgMix, paper);
    const card = this.config.white;
    const ink = this.mix(primary, tone.inkMix, this.config.darkInk);
    const muted = this.mix(ink, tone.mutedMix, bg);
    const hairline = this.mix(ink, tone.hairMix, bg);
    const tint = this.mix(secondary, tone.tintMix, this.config.white);
    const emph = secondary;
    const emphInk = this.mix(secondary, this.config.emphInkMix, ink);
    const accent = primary;
    const accentInk = this.mix(primary, this.config.emphInkMix, ink);

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
      accent,
      accentInk,
      onPrimary: cfg.onPrimary || this.onColor(rawPrimary),
      onSecondary: cfg.onSecondary || this.onColor(rawSecondary),
      saturationCap: cap,
    };
  }
}

export const qmColorEngine = QmColorEngine.getInstance();
