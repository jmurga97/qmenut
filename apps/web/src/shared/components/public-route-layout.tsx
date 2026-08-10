import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useMenuContent } from "~/features/menu/hooks/use-menu-content";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicRouteLayoutContext } from "~/shared/components/public-route-layout-context";
import { ScrollCompactHeroHeader } from "~/shared/components/scroll-compact-hero-header";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { TenantNotFound } from "~/shared/components/tenant-not-found";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";
import { photoUrl } from "~/shared/lib/photo-url";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";
import type { RefObject } from "react";
import type { PublicTenant } from "~/shared/types/public-tenant";

const HERO_IMAGE_WIDTH_PX = 430;

export function PublicRouteLayout() {
  const { tenant } = usePublicTenant();
  const { template } = useTemplateSelection(tenant);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const layoutContextValue = useMemo(
    () => (tenant ? { scrollContainerRef, template, tenant } : null),
    [template, tenant],
  );

  if (!tenant || !layoutContextValue) {
    return <TenantNotFound />;
  }

  return (
    <PublicRouteLayoutContext.Provider value={layoutContextValue}>
      <PublicPageShell tenant={tenant} template={template}>
        <PublicRouteHeader scrollContainerRef={scrollContainerRef} template={template} tenant={tenant} />
        <div className="home-scroll" ref={scrollContainerRef}>
          <Outlet />
        </div>
      </PublicPageShell>
    </PublicRouteLayoutContext.Provider>
  );
}

interface PublicRouteHeaderProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  template: QmTemplateName;
  tenant: PublicTenant;
}

function PublicRouteHeader({ scrollContainerRef, template, tenant }: PublicRouteHeaderProps) {
  const routeId = useRouterState({ select: (state) => state.matches.at(-1)?.routeId });
  const locale = useLocale();

  if (routeId === "/{-$locale}/") {
    return (
      <MenuRouteHeader locale={locale} scrollContainerRef={scrollContainerRef} template={template} tenant={tenant} />
    );
  }

  return (
    <StandardRouteHeader locale={locale} routeId={routeId} scrollContainerRef={scrollContainerRef} tenant={tenant} />
  );
}

interface MenuRouteHeaderProps {
  locale: ReturnType<typeof useLocale>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  template: QmTemplateName;
  tenant: PublicTenant;
}

function MenuRouteHeader({ locale, scrollContainerRef, template, tenant }: MenuRouteHeaderProps) {
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

interface StandardRouteHeaderProps {
  locale: ReturnType<typeof useLocale>;
  routeId: string | undefined;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  tenant: PublicTenant;
}

function StandardRouteHeader({ locale, routeId, scrollContainerRef, tenant }: StandardRouteHeaderProps) {
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

function getStandardHeaderCopy(routeId: string | undefined, t: ReturnType<typeof useTranslation>["t"]) {
  switch (routeId) {
    case "/{-$locale}/destacados":
      return { subtitle: t("destacados.page.subtitle"), title: t("destacados.page.title") };
    case "/{-$locale}/contacto":
      return { subtitle: t("contact.page.subtitle"), title: t("contact.page.title") };
    case "/{-$locale}/puntos":
      return { subtitle: t("loyalty.page.subtitle"), title: t("loyalty.page.title") };
    case "/{-$locale}/aviso-legal":
      return { subtitle: t("legal.legalNotice.subtitle"), title: t("legal.legalNotice.title") };
    case "/{-$locale}/privacidad":
      return { subtitle: t("legal.privacy.subtitle"), title: t("legal.privacy.title") };
    case undefined:
    default:
      return { subtitle: "", title: t("common.navigation.menu") };
  }
}
