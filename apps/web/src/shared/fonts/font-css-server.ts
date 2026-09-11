import antonCss from "./anton.css?inline";
import barlowCss from "./barlow.css?inline";
import bebasNeueCss from "./bebas-neue.css?inline";
import cormorantGaramondCss from "./cormorant-garamond.css?inline";
import dmSansCss from "./dm-sans.css?inline";
import jostCss from "./jost.css?inline";
import nunitoSansCss from "./nunito-sans.css?inline";
import playfairDisplayCss from "./playfair-display.css?inline";
import quicksandCss from "./quicksand.css?inline";
import spectralCss from "./spectral.css?inline";
import workSansCss from "./work-sans.css?inline";
import yesevaOneCss from "./yeseva-one.css?inline";

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
