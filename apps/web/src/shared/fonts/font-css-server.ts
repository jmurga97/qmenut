import antonCss from "@qmenut/ui/fonts/anton.css?inline";
import barlowCss from "@qmenut/ui/fonts/barlow.css?inline";
import bebasNeueCss from "@qmenut/ui/fonts/bebas-neue.css?inline";
import cormorantGaramondCss from "@qmenut/ui/fonts/cormorant-garamond.css?inline";
import dmSansCss from "@qmenut/ui/fonts/dm-sans.css?inline";
import jostCss from "@qmenut/ui/fonts/jost.css?inline";
import nunitoSansCss from "@qmenut/ui/fonts/nunito-sans.css?inline";
import playfairDisplayCss from "@qmenut/ui/fonts/playfair-display.css?inline";
import quicksandCss from "@qmenut/ui/fonts/quicksand.css?inline";
import spectralCss from "@qmenut/ui/fonts/spectral.css?inline";
import workSansCss from "@qmenut/ui/fonts/work-sans.css?inline";
import yesevaOneCss from "@qmenut/ui/fonts/yeseva-one.css?inline";

import type { QmFontId } from "@qmenut/ui/theme/font-catalog";

export const FONT_CSS_TEXT: Record<QmFontId, string> = {
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
