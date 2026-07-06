import { QM_ALLERGEN_TAG_NAME, QmAllergen, defineQmAllergen } from "./components/atoms/qm-allergen";
import { QM_BADGE_TAG_NAME, QmBadge, defineQmBadge } from "./components/atoms/qm-badge";
import { QM_BUTTON_TAG_NAME, QmButton, defineQmButton } from "./components/atoms/qm-button";
import { QM_CHIP_TAG_NAME, QmChip, defineQmChip } from "./components/atoms/qm-chip";
import { QM_DISH_EXTRAS_TAG_NAME, QmDishExtras, defineQmDishExtras } from "./components/atoms/qm-dish-extras";
import { QM_DIVIDER_TAG_NAME, QmDivider, defineQmDivider } from "./components/atoms/qm-divider";
import { QM_EYEBROW_TAG_NAME, QmEyebrow, defineQmEyebrow } from "./components/atoms/qm-eyebrow";
import { QM_FIELD_TAG_NAME, QmField, defineQmField } from "./components/atoms/qm-field";
import { QM_HEADING_TAG_NAME, QmHeading, defineQmHeading } from "./components/atoms/qm-heading";
import { QM_IMAGE_TAG_NAME, QmImage, defineQmImage } from "./components/atoms/qm-image";
import { QM_LANG_TAG_NAME, QmLang, defineQmLang } from "./components/atoms/qm-lang";
import { QM_PIN_TAG_NAME, QmPin, defineQmPin } from "./components/atoms/qm-pin";
import { QM_PRICE_TAG_NAME, QmPrice, defineQmPrice } from "./components/atoms/qm-price";
import { QM_SECTION_NUM_TAG_NAME, QmSectionNum, defineQmSectionNum } from "./components/atoms/qm-section-num";
import { QM_SKELETON_TAG_NAME, QmSkeleton, defineQmSkeleton } from "./components/atoms/qm-skeleton";
import { QM_TAB_TAG_NAME, QmTab, defineQmTab } from "./components/atoms/qm-tab";
import { QM_WORDMARK_TAG_NAME, QmWordmark, defineQmWordmark } from "./components/atoms/qm-wordmark";
import { QM_DISH_ROW_TAG_NAME, QmDishRow, defineQmDishRow } from "./components/molecules/qm-dish-row";
import { QM_FEATURED_TAG_NAME, QmFeatured, defineQmFeatured } from "./components/molecules/qm-featured";
import { QM_FIELD_GROUP_TAG_NAME, QmFieldGroup, defineQmFieldGroup } from "./components/molecules/qm-field-group";
import { QM_LOCATION_TAG_NAME, QmLocation, defineQmLocation } from "./components/molecules/qm-location";
import { QM_PROMO_TAG_NAME, QmPromo, defineQmPromo } from "./components/molecules/qm-promo";
import {
  QM_SECTION_HEADER_TAG_NAME,
  QmSectionHeader,
  defineQmSectionHeader,
} from "./components/molecules/qm-section-header";
import {
  QM_CONTACT_PANEL_TAG_NAME,
  QmContactPanel,
  defineQmContactPanel,
} from "./components/organisms/qm-contact-panel";
import { QM_DISH_MODAL_TAG_NAME, QmDishModal, defineQmDishModal } from "./components/organisms/qm-dish-modal";
import { QM_HERO_HEADER_TAG_NAME, QmHeroHeader, defineQmHeroHeader } from "./components/organisms/qm-hero-header";
import { QM_MENU_LIST_TAG_NAME, QmMenuList, defineQmMenuList } from "./components/organisms/qm-menu-list";
import { QM_NAV_BAR_TAG_NAME, QmNavBar, defineQmNavBar } from "./components/organisms/qm-nav-bar";
import { QM_PAGE_HEADER_TAG_NAME, QmPageHeader, defineQmPageHeader } from "./components/organisms/qm-page-header";
import { QM_PROMO_LIST_TAG_NAME, QmPromoList, defineQmPromoList } from "./components/organisms/qm-promo-list";
import { applyQmTheme, buildQmThemeVars } from "./theme/apply-theme";
import { deriveQmTheme, mix } from "./theme/derive";
import {
  getFontStack,
  isBodyFontId,
  isHeadingFontId,
  QM_FONT_CATALOG,
  QM_FONT_IDS,
} from "./theme/font-catalog";
import { TEMPLATES } from "./theme/presets";
import {
  buildDefaultTenantThemeConfig,
  DEFAULT_TEMPLATE,
  DEFAULT_TENANT_COLORS,
  resolveTenantThemeConfig,
} from "./theme/tenant-theme-config";

import type { QmAllergenArgs } from "./components/atoms/qm-allergen";
import type { QmBadgeArgs } from "./components/atoms/qm-badge";
import type { QmButtonArgs, QmButtonSize, QmButtonVariant } from "./components/atoms/qm-button";
import type { QmChipArgs, QmChipVariant } from "./components/atoms/qm-chip";
import type { QmDishExtraItem, QmDishExtrasArgs } from "./components/atoms/qm-dish-extras";
import type { QmDividerArgs, QmDividerVariant } from "./components/atoms/qm-divider";
import type { QmEyebrowArgs } from "./components/atoms/qm-eyebrow";
import type { QmFieldArgs, QmFieldType } from "./components/atoms/qm-field";
import type { QmHeadingArgs } from "./components/atoms/qm-heading";
import type { QmImageArgs } from "./components/atoms/qm-image";
import type { QmLangArgs, QmLangOption } from "./components/atoms/qm-lang";
import type { QmPinArgs } from "./components/atoms/qm-pin";
import type { QmPriceArgs } from "./components/atoms/qm-price";
import type { QmSectionNumArgs } from "./components/atoms/qm-section-num";
import type { QmSkeletonArgs } from "./components/atoms/qm-skeleton";
import type { QmTabArgs } from "./components/atoms/qm-tab";
import type { QmWordmarkArgs } from "./components/atoms/qm-wordmark";
import type { QmDishRowArgs } from "./components/molecules/qm-dish-row";
import type { QmFeaturedArgs } from "./components/molecules/qm-featured";
import type { QmFieldGroupArgs } from "./components/molecules/qm-field-group";
import type { QmLocationArgs } from "./components/molecules/qm-location";
import type { QmPromoArgs } from "./components/molecules/qm-promo";
import type { QmSectionHeaderArgs } from "./components/molecules/qm-section-header";
import type { QmContactPanelArgs } from "./components/organisms/qm-contact-panel";
import type { QmDishModalArgs } from "./components/organisms/qm-dish-modal";
import type { QmHeroHeaderArgs } from "./components/organisms/qm-hero-header";
import type { QmMenuListArgs } from "./components/organisms/qm-menu-list";
import type { QmNavBarArgs } from "./components/organisms/qm-nav-bar";
import type { QmPageHeaderArgs } from "./components/organisms/qm-page-header";
import type { QmPromoListArgs } from "./components/organisms/qm-promo-list";
import type { QmThemeInput } from "./theme/apply-theme";
import type { QmDerivedColors, QmThemeConfig } from "./theme/derive";
import type { QmFontCatalogEntry, QmFontId, QmFontRole } from "./theme/font-catalog";
import type {
  QmBadgeShape,
  QmNavStyle,
  QmPhotoMode,
  QmTemplateName,
  QmTemplatePreset,
  QmToneMix,
} from "./theme/presets";
import type { QmTenantThemeConfig } from "./theme/tenant-theme-config";
import type { QmThemeTokens } from "./theme/tokens";

export {
  applyQmTheme,
  buildDefaultTenantThemeConfig,
  buildQmThemeVars,
  DEFAULT_TEMPLATE,
  DEFAULT_TENANT_COLORS,
  resolveTenantThemeConfig,
  getFontStack,
  isBodyFontId,
  isHeadingFontId,
  QM_FONT_CATALOG,
  QM_FONT_IDS,
  defineQmAllergen,
  defineQmBadge,
  defineQmButton,
  defineQmChip,
  defineQmContactPanel,
  defineQmDishExtras,
  defineQmDishModal,
  defineQmDishRow,
  defineQmDivider,
  defineQmEyebrow,
  defineQmFeatured,
  defineQmField,
  defineQmFieldGroup,
  defineQmHeading,
  defineQmHeroHeader,
  defineQmImage,
  defineQmLang,
  defineQmLocation,
  defineQmMenuList,
  defineQmNavBar,
  defineQmPageHeader,
  defineQmPin,
  defineQmPrice,
  defineQmPromo,
  defineQmPromoList,
  defineQmSectionHeader,
  defineQmSectionNum,
  defineQmSkeleton,
  defineQmTab,
  defineQmWordmark,
  deriveQmTheme,
  mix,
  QM_ALLERGEN_TAG_NAME,
  QM_BADGE_TAG_NAME,
  QM_BUTTON_TAG_NAME,
  QM_CHIP_TAG_NAME,
  QM_CONTACT_PANEL_TAG_NAME,
  QM_DISH_EXTRAS_TAG_NAME,
  QM_DISH_MODAL_TAG_NAME,
  QM_DISH_ROW_TAG_NAME,
  QM_DIVIDER_TAG_NAME,
  QM_EYEBROW_TAG_NAME,
  QM_FEATURED_TAG_NAME,
  QM_FIELD_TAG_NAME,
  QM_FIELD_GROUP_TAG_NAME,
  QM_HEADING_TAG_NAME,
  QM_HERO_HEADER_TAG_NAME,
  QM_IMAGE_TAG_NAME,
  QM_LANG_TAG_NAME,
  QM_LOCATION_TAG_NAME,
  QM_MENU_LIST_TAG_NAME,
  QM_NAV_BAR_TAG_NAME,
  QM_PAGE_HEADER_TAG_NAME,
  QM_PIN_TAG_NAME,
  QM_PRICE_TAG_NAME,
  QM_PROMO_TAG_NAME,
  QM_PROMO_LIST_TAG_NAME,
  QM_SECTION_HEADER_TAG_NAME,
  QM_SECTION_NUM_TAG_NAME,
  QM_SKELETON_TAG_NAME,
  QM_TAB_TAG_NAME,
  QM_WORDMARK_TAG_NAME,
  QmAllergen,
  QmBadge,
  QmButton,
  QmChip,
  QmContactPanel,
  QmDishExtras,
  QmDishModal,
  QmDishRow,
  QmDivider,
  QmEyebrow,
  QmFeatured,
  QmField,
  QmFieldGroup,
  QmHeading,
  QmHeroHeader,
  QmImage,
  QmLang,
  QmLocation,
  QmMenuList,
  QmNavBar,
  QmPageHeader,
  QmPin,
  QmPrice,
  QmPromo,
  QmPromoList,
  QmSectionHeader,
  QmSectionNum,
  QmSkeleton,
  QmTab,
  QmWordmark,
  TEMPLATES,
};

export type {
  QmAllergenArgs,
  QmBadgeArgs,
  QmBadgeShape,
  QmButtonArgs,
  QmButtonSize,
  QmButtonVariant,
  QmChipArgs,
  QmChipVariant,
  QmContactPanelArgs,
  QmDishExtraItem,
  QmDishExtrasArgs,
  QmDerivedColors,
  QmDishModalArgs,
  QmFontCatalogEntry,
  QmFontId,
  QmFontRole,
  QmDishRowArgs,
  QmDividerArgs,
  QmDividerVariant,
  QmEyebrowArgs,
  QmFeaturedArgs,
  QmFieldArgs,
  QmFieldGroupArgs,
  QmFieldType,
  QmHeadingArgs,
  QmHeroHeaderArgs,
  QmImageArgs,
  QmLangArgs,
  QmLangOption,
  QmLocationArgs,
  QmMenuListArgs,
  QmNavBarArgs,
  QmNavStyle,
  QmPageHeaderArgs,
  QmPhotoMode,
  QmPinArgs,
  QmPriceArgs,
  QmPromoArgs,
  QmPromoListArgs,
  QmSectionHeaderArgs,
  QmSectionNumArgs,
  QmSkeletonArgs,
  QmTabArgs,
  QmTemplateName,
  QmTemplatePreset,
  QmTenantThemeConfig,
  QmThemeConfig,
  QmThemeInput,
  QmThemeTokens,
  QmToneMix,
  QmWordmarkArgs,
};

/** Registers all thirty custom elements (seventeen atoms + six molecules + seven organisms). Safe to call more than once. */
export function registerQmComponents(): void {
  defineQmWordmark();
  defineQmHeading();
  defineQmSectionNum();
  defineQmButton();
  defineQmEyebrow();
  defineQmDivider();
  defineQmPrice();
  defineQmBadge();
  defineQmChip();
  defineQmPin();
  defineQmSkeleton();
  defineQmImage();
  defineQmTab();
  defineQmField();
  defineQmLang();
  defineQmAllergen();
  defineQmDishExtras();

  // Molecules
  defineQmSectionHeader();
  defineQmDishRow();
  defineQmFeatured();
  defineQmPromo();
  defineQmLocation();
  defineQmFieldGroup();

  // Organisms
  defineQmHeroHeader();
  defineQmPageHeader();
  defineQmMenuList();
  defineQmPromoList();
  defineQmContactPanel();
  defineQmNavBar();
  defineQmDishModal();
}
