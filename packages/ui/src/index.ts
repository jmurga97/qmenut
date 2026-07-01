import { QM_BUTTON_TAG_NAME, QmButton, defineQmButton } from "./components/atoms/qm-button";
import { QM_HEADING_TAG_NAME, QmHeading, defineQmHeading } from "./components/atoms/qm-heading";
import { QM_SECTION_NUM_TAG_NAME, QmSectionNum, defineQmSectionNum } from "./components/atoms/qm-section-num";
import { QM_WORDMARK_TAG_NAME, QmWordmark, defineQmWordmark } from "./components/atoms/qm-wordmark";
import { applyQmTheme, buildQmThemeVars } from "./theme/apply-theme";
import { deriveQmTheme, mix } from "./theme/derive";
import { ARCHETYPES } from "./theme/presets";

import type { QmButtonArgs, QmButtonSize, QmButtonVariant } from "./components/atoms/qm-button";
import type { QmHeadingArgs } from "./components/atoms/qm-heading";
import type { QmSectionNumArgs } from "./components/atoms/qm-section-num";
import type { QmWordmarkArgs } from "./components/atoms/qm-wordmark";
import type { QmThemeInput } from "./theme/apply-theme";
import type { QmDerivedColors, QmThemeConfig } from "./theme/derive";
import type {
  QmArchetypeName,
  QmArchetypePreset,
  QmBadgeShape,
  QmNavStyle,
  QmPhotoMode,
  QmToneMix,
} from "./theme/presets";
import type { QmThemeTokens } from "./theme/tokens";

export {
  ARCHETYPES,
  applyQmTheme,
  buildQmThemeVars,
  defineQmButton,
  defineQmHeading,
  defineQmSectionNum,
  defineQmWordmark,
  deriveQmTheme,
  mix,
  QM_BUTTON_TAG_NAME,
  QM_HEADING_TAG_NAME,
  QM_SECTION_NUM_TAG_NAME,
  QM_WORDMARK_TAG_NAME,
  QmButton,
  QmHeading,
  QmSectionNum,
  QmWordmark,
};

export type {
  QmArchetypeName,
  QmArchetypePreset,
  QmBadgeShape,
  QmButtonArgs,
  QmButtonSize,
  QmButtonVariant,
  QmDerivedColors,
  QmHeadingArgs,
  QmNavStyle,
  QmPhotoMode,
  QmSectionNumArgs,
  QmThemeConfig,
  QmThemeInput,
  QmThemeTokens,
  QmToneMix,
  QmWordmarkArgs,
};

/** Registers all four custom elements. Safe to call more than once. */
export function registerQmComponents(): void {
  defineQmWordmark();
  defineQmHeading();
  defineQmSectionNum();
  defineQmButton();
}
