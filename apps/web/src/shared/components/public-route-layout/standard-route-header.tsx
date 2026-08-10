import { useTranslation } from "react-i18next";

import { getStandardHeaderCopy } from "~/shared/components/public-route-layout/get-standard-header-copy";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";

import type { RefObject } from "react";
import type { useLocale } from "~/shared/hooks/use-locale";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface StandardRouteHeaderProps {
  locale: ReturnType<typeof useLocale>;
  routeId: string | undefined;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  tenant: PublicTenant;
}

export function StandardRouteHeader({ locale, routeId, scrollContainerRef, tenant }: StandardRouteHeaderProps) {
  const { t } = useTranslation();
  const copy = getStandardHeaderCopy(routeId, t);

  return (
    <ScrollHidePageHeader
      scrollContainerRef={scrollContainerRef}
      topbarBrand="QMENUT"
      topbarName={tenant.tenantName}
      title={copy.title}
      subtitle={copy.subtitle}
      langValue={locale.lang}
      langOptions={locale.langOptions}
      langLabel={locale.langLabel}
      titleSize="lg"
      onQmChange={locale.handleLanguageChange}
    />
  );
}
