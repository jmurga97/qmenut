import { useTranslation } from "react-i18next";

import { getStandardHeaderCopy } from "~/shared/components/public-route-layout/get-standard-header-copy";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";

import type { QmLangOption } from "@qmenut/ui/components/qm-lang";
import type { RefObject } from "react";
import type { useLocale } from "~/shared/hooks/use-locale";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface StandardRouteHeaderProps {
  locale: ReturnType<typeof useLocale>;
  currencyLabel: string;
  currencyOptions: QmLangOption[];
  currencyValue: string;
  onQmCurrencyChange: (event: CustomEvent<{ value: string }>) => void;
  routeId: string | undefined;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  tenant: PublicTenant;
}

export function StandardRouteHeader({
  currencyLabel,
  currencyOptions,
  currencyValue,
  locale,
  onQmCurrencyChange,
  routeId,
  scrollContainerRef,
  tenant,
}: StandardRouteHeaderProps) {
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
      currencyLabel={currencyLabel}
      currencyOptions={currencyOptions}
      currencyValue={currencyValue}
      titleSize="lg"
      hideSeparator={routeId === "/{-$locale}/contacto"}
      onQmChange={locale.handleLanguageChange}
      onQmCurrencyChange={onQmCurrencyChange}
    />
  );
}
