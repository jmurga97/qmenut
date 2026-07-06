import type { QmAllergen, QmAllergenArgs } from "./components/atoms/qm-allergen";
import type { QmBadge, QmBadgeArgs } from "./components/atoms/qm-badge";
import type { QmButton, QmButtonArgs } from "./components/atoms/qm-button";
import type { QmChip, QmChipArgs } from "./components/atoms/qm-chip";
import type { QmDishExtras, QmDishExtrasArgs } from "./components/atoms/qm-dish-extras";
import type { QmDivider, QmDividerArgs } from "./components/atoms/qm-divider";
import type { QmEyebrow, QmEyebrowArgs } from "./components/atoms/qm-eyebrow";
import type { QmField, QmFieldArgs } from "./components/atoms/qm-field";
import type { QmHeading, QmHeadingArgs } from "./components/atoms/qm-heading";
import type { QmImage, QmImageArgs } from "./components/atoms/qm-image";
import type { QmLang, QmLangArgs } from "./components/atoms/qm-lang";
import type { QmPin, QmPinArgs } from "./components/atoms/qm-pin";
import type { QmPrice, QmPriceArgs } from "./components/atoms/qm-price";
import type { QmSectionNum, QmSectionNumArgs } from "./components/atoms/qm-section-num";
import type { QmSkeleton, QmSkeletonArgs } from "./components/atoms/qm-skeleton";
import type { QmTab, QmTabArgs } from "./components/atoms/qm-tab";
import type { QmWordmark, QmWordmarkArgs } from "./components/atoms/qm-wordmark";
import type { QmDishRow, QmDishRowArgs } from "./components/molecules/qm-dish-row";
import type { QmFeatured, QmFeaturedArgs } from "./components/molecules/qm-featured";
import type { QmFieldGroup, QmFieldGroupArgs } from "./components/molecules/qm-field-group";
import type { QmLocation, QmLocationArgs } from "./components/molecules/qm-location";
import type { QmPromo, QmPromoArgs } from "./components/molecules/qm-promo";
import type { QmSectionHeader, QmSectionHeaderArgs } from "./components/molecules/qm-section-header";
import type { QmContactPanel, QmContactPanelArgs } from "./components/organisms/qm-contact-panel";
import type { QmDishModal, QmDishModalArgs } from "./components/organisms/qm-dish-modal";
import type { QmHeroHeader, QmHeroHeaderArgs } from "./components/organisms/qm-hero-header";
import type { QmMenuList, QmMenuListArgs } from "./components/organisms/qm-menu-list";
import type { QmNavBar, QmNavBarArgs } from "./components/organisms/qm-nav-bar";
import type { QmPageHeader, QmPageHeaderArgs } from "./components/organisms/qm-page-header";
import type { QmPromoList, QmPromoListArgs } from "./components/organisms/qm-promo-list";
import type { DetailedHTMLProps, HTMLAttributes } from "react";
// Forces TS to fully resolve "react/jsx-runtime" via normal import resolution first —
// declaring a module augmentation for it directly (below) doesn't reliably trigger the
// same resolution path under this repo's exports-map + moduleResolution combination.
import type {} from "react/jsx-runtime";

/**
 * Kebab-case attribute passthrough. Lit properties declared with a custom kebab attribute
 * (e.g. `section-label`) must be written as attributes from JSX: React serializes camelCase
 * props as same-named attributes during SSR, which Lit never syncs, and skips property
 * assignment during hydration — so SSR'd values would be lost until the prop next changes.
 */
type KebabAttributes = {
  [attribute: `${string}-${string}`]: string | number | boolean | undefined;
};

export type GenericWebComponent<P, T extends HTMLElement = HTMLElement> = DetailedHTMLProps<HTMLAttributes<T>, T> &
  Omit<P, "ariaLabel"> &
  KebabAttributes;

declare module "react/jsx-runtime" {
  // Module augmentation follows React's JSX namespace contract.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "qm-allergen": GenericWebComponent<QmAllergenArgs, QmAllergen>;
      "qm-badge": GenericWebComponent<QmBadgeArgs, QmBadge>;
      "qm-button": GenericWebComponent<QmButtonArgs, QmButton>;
      "qm-chip": GenericWebComponent<QmChipArgs, QmChip>;
      "qm-dish-extras": GenericWebComponent<QmDishExtrasArgs, QmDishExtras>;
      "qm-divider": GenericWebComponent<QmDividerArgs, QmDivider>;
      "qm-eyebrow": GenericWebComponent<QmEyebrowArgs, QmEyebrow>;
      "qm-field": GenericWebComponent<QmFieldArgs, QmField>;
      "qm-heading": GenericWebComponent<QmHeadingArgs, QmHeading>;
      "qm-image": GenericWebComponent<QmImageArgs, QmImage>;
      "qm-lang": GenericWebComponent<QmLangArgs, QmLang>;
      "qm-pin": GenericWebComponent<QmPinArgs, QmPin>;
      "qm-price": GenericWebComponent<QmPriceArgs, QmPrice>;
      "qm-section-num": GenericWebComponent<QmSectionNumArgs, QmSectionNum>;
      "qm-skeleton": GenericWebComponent<QmSkeletonArgs, QmSkeleton>;
      "qm-tab": GenericWebComponent<QmTabArgs, QmTab>;
      "qm-wordmark": GenericWebComponent<QmWordmarkArgs, QmWordmark>;
      "qm-dish-row": GenericWebComponent<QmDishRowArgs, QmDishRow>;
      "qm-featured": GenericWebComponent<QmFeaturedArgs, QmFeatured>;
      "qm-field-group": GenericWebComponent<QmFieldGroupArgs, QmFieldGroup>;
      "qm-location": GenericWebComponent<QmLocationArgs, QmLocation>;
      "qm-promo": GenericWebComponent<QmPromoArgs, QmPromo>;
      "qm-section-header": GenericWebComponent<QmSectionHeaderArgs, QmSectionHeader>;
      "qm-contact-panel": GenericWebComponent<QmContactPanelArgs, QmContactPanel>;
      "qm-dish-modal": GenericWebComponent<QmDishModalArgs, QmDishModal>;
      "qm-hero-header": GenericWebComponent<QmHeroHeaderArgs, QmHeroHeader>;
      "qm-menu-list": GenericWebComponent<QmMenuListArgs, QmMenuList>;
      "qm-nav-bar": GenericWebComponent<QmNavBarArgs, QmNavBar>;
      "qm-page-header": GenericWebComponent<QmPageHeaderArgs, QmPageHeader>;
      "qm-promo-list": GenericWebComponent<QmPromoListArgs, QmPromoList>;
    }
  }
}
