import { TEMPLATES } from "@qmenut/ui/theme/presets";

import { useMenuContent } from "~/features/menu/hooks/menu-content-context";
import { ScrollCompactHeroHeader } from "~/shared/components/scroll-compact-hero-header";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { HERO_PHOTO_LAYOUT } from "~/shared/lib/photo-layout";
import { responsivePhotoSource } from "~/shared/lib/photo-url";

import type { QmLangOption } from "@qmenut/ui/components/qm-lang";
import type { QmTemplateName } from "@qmenut/ui/theme/presets";
import type { RefObject } from "react";
import type { useLocale } from "~/shared/hooks/use-locale";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface MenuRouteHeaderProps {
  locale: ReturnType<typeof useLocale>;
  currencyLabel: string;
  currencyOptions: QmLangOption[];
  currencyValue: string;
  onQmCurrencyChange: (event: CustomEvent<{ value: string }>) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  template: QmTemplateName;
  tenant: PublicTenant;
}

export function MenuRouteHeader({
  currencyLabel,
  currencyOptions,
  currencyValue,
  locale,
  onQmCurrencyChange,
  scrollContainerRef,
  template,
  tenant,
}: MenuRouteHeaderProps) {
  const content = useMenuContent();
  const useHeroHeader = TEMPLATES[template].photoMode === "hero" || TEMPLATES[template].photoMode === "heroxl";
  const heroSource = responsivePhotoSource({
    canonicalUrl: tenant.heroPhotoUrl,
    ...HERO_PHOTO_LAYOUT,
    variants: tenant.heroPhotoVariants,
  });

  if (useHeroHeader) {
    return (
      <ScrollCompactHeroHeader
        scrollContainerRef={scrollContainerRef}
        heroLabel={content?.heroLabel ?? ""}
        name={tenant.tenantName}
        tagline={tenant.tenantTagline}
        langValue={locale.lang}
        langOptions={locale.langOptions}
        langLabel={locale.langLabel}
        logoLabel={content?.logoLabel ?? "QM"}
        onQmChange={locale.handleLanguageChange}
        currencyLabel={currencyLabel}
        currencyOptions={currencyOptions}
        currencyValue={currencyValue}
        onQmCurrencyChange={onQmCurrencyChange}
      >
        <img
          slot="photo"
          src={heroSource?.src}
          srcSet={heroSource?.srcSet}
          sizes={heroSource?.sizes}
          onError={(event) => {
            const image = event.currentTarget;
            if (image.getAttribute("src") === tenant.heroPhotoUrl && !image.hasAttribute("srcset")) return;
            image.removeAttribute("srcset");
            image.src = tenant.heroPhotoUrl;
          }}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
      </ScrollCompactHeroHeader>
    );
  }

  return (
    <ScrollHidePageHeader
      scrollContainerRef={scrollContainerRef}
      topbarBrand={tenant.tenantName}
      title={tenant.tenantName}
      subtitle={tenant.tenantTagline}
      langValue={locale.lang}
      langOptions={locale.langOptions}
      langLabel={locale.langLabel}
      currencyLabel={currencyLabel}
      currencyOptions={currencyOptions}
      currencyValue={currencyValue}
      titleSize="lg"
      onQmChange={locale.handleLanguageChange}
      onQmCurrencyChange={onQmCurrencyChange}
    />
  );
}
