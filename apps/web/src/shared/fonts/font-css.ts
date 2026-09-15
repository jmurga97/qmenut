import antonCss from "@qmenut/ui/fonts/anton.css?url";
import barlowCss from "@qmenut/ui/fonts/barlow.css?url";
import bebasNeueCss from "@qmenut/ui/fonts/bebas-neue.css?url";
import cormorantGaramondCss from "@qmenut/ui/fonts/cormorant-garamond.css?url";
import dmSansCss from "@qmenut/ui/fonts/dm-sans.css?url";
import jostCss from "@qmenut/ui/fonts/jost.css?url";
import nunitoSansCss from "@qmenut/ui/fonts/nunito-sans.css?url";
import playfairDisplayCss from "@qmenut/ui/fonts/playfair-display.css?url";
import quicksandCss from "@qmenut/ui/fonts/quicksand.css?url";
import spectralCss from "@qmenut/ui/fonts/spectral.css?url";
import workSansCss from "@qmenut/ui/fonts/work-sans.css?url";
import yesevaOneCss from "@qmenut/ui/fonts/yeseva-one.css?url";
import { QM_FONT_CATALOG, QM_FONT_IDS } from "@qmenut/ui/theme/font-catalog";
import { TEMPLATES } from "@qmenut/ui/theme/presets";

import type { QmFontId } from "@qmenut/ui/theme/font-catalog";
import type { QmTemplateName } from "@qmenut/ui/theme/presets";

export const FONT_CSS_URLS: Record<QmFontId, string> = {
  "cormorant-garamond": cormorantGaramondCss,
  "playfair-display": playfairDisplayCss,
  "yeseva-one": yesevaOneCss,
  anton: antonCss,
  "bebas-neue": bebasNeueCss,
  quicksand: quicksandCss,
  jost: jostCss,
  spectral: spectralCss,
  "work-sans": workSansCss,
  barlow: barlowCss,
  "nunito-sans": nunitoSansCss,
  "dm-sans": dmSansCss,
};

const FONT_ASSET_URLS = import.meta.glob<string>("../../../../../packages/ui/src/fonts/*-latin-*-normal.woff2", {
  eager: true,
  import: "default",
  query: "?url",
});

type FontPreloadUrls = Record<QmFontId, Record<number, string>>;

function getFontAssetUrl(fontId: QmFontId, weight: number): string {
  const key = `../../../../../packages/ui/src/fonts/${fontId}-latin-${weight}-normal.woff2`;
  const url = FONT_ASSET_URLS[key];

  if (!url) {
    throw new Error(`Missing vendored latin font asset for ${fontId} weight ${weight}`);
  }

  return url;
}

export const FONT_PRELOAD_URLS = Object.fromEntries(
  QM_FONT_IDS.map((fontId) => [
    fontId,
    Object.fromEntries(QM_FONT_CATALOG[fontId].weights.map((weight) => [weight, getFontAssetUrl(fontId, weight)])),
  ]),
) as FontPreloadUrls;

export interface TenantFontTheme {
  template: QmTemplateName;
  headingFont?: QmFontId;
  bodyFont?: QmFontId;
}

export function resolveTenantFontIds(theme: TenantFontTheme): { heading: QmFontId; body: QmFontId } {
  const preset = TEMPLATES[theme.template];

  return {
    heading: theme.headingFont ?? preset.headingFontId,
    body: theme.bodyFont ?? preset.bodyFontId,
  };
}

export function getFontPreloadUrl(fontId: QmFontId, requestedWeight: number): string {
  const familyUrls = FONT_PRELOAD_URLS[fontId];

  return familyUrls[requestedWeight] ?? familyUrls[QM_FONT_CATALOG[fontId].weights[0]];
}
