import { TEMPLATES } from "@qmenut/ui/theme/presets";

import { useMenuContent } from "~/features/menu/hooks/use-menu-content";
import { ScrollCompactHeroHeader } from "~/shared/components/scroll-compact-hero-header";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { photoUrl } from "~/shared/lib/photo-url";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";
import type { RefObject } from "react";
import type { useLocale } from "~/shared/hooks/use-locale";
import type { PublicTenant } from "~/shared/types/public-tenant";

const HERO_IMAGE_WIDTH_PX = 430;

interface MenuRouteHeaderProps {
  locale: ReturnType<typeof useLocale>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  template: QmTemplateName;
  tenant: PublicTenant;
}

export function MenuRouteHeader({ locale, scrollContainerRef, template, tenant }: MenuRouteHeaderProps) {
  const content = useMenuContent();
  const useHeroHeader = TEMPLATES[template].photoMode === "hero" || TEMPLATES[template].photoMode === "heroxl";

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
      >
        <img
          slot="photo"
          src={photoUrl(tenant.heroPhotoUrl, HERO_IMAGE_WIDTH_PX)}
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
      titleSize="lg"
      onQmChange={locale.handleLanguageChange}
    />
  );
}
