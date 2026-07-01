import { qmColorEngine } from "./color-engine";

import type { QmDerivedColors, QmThemeConfig } from "./color-engine";

export type { QmColorEngineConfig } from "./color-engine";
export type { QmDerivedColors, QmThemeConfig };
export { qmColorEngine };

/** Builds a `color-mix(in oklab, ...)` CSS string — used across the whole theme engine. */
export function mix(a: string, percent: number, b: string): string {
  return qmColorEngine.mix(a, percent, b);
}

/**
 * Governed derivation: a template + 2 tenant colors → the full color group. All color logic
 * (chroma clamping, on-color contrast, mixing) lives in the `qmColorEngine` singleton — see
 * `theme/color-engine.ts`.
 */
export function deriveQmTheme(cfg: QmThemeConfig): QmDerivedColors {
  return qmColorEngine.derive(cfg);
}
