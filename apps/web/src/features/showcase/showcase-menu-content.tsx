import { QmAllergen } from "@qmenut/ui/components/qm-allergen/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ShowcaseLoyalty } from "~/features/showcase/showcase-loyalty";
import { useShowcaseStep } from "~/features/showcase/use-showcase-step";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";
import { ALLERGEN_META } from "~/shared/public-menu/allergens";
import { MenuContentContext, useMenuContent } from "~/shared/public-menu/menu-content-context";
import { createPublicPriceFormatter } from "~/shared/public-menu/price-formatter";
import { getPublicMenuQueryOptions } from "~/shared/public-menu/public-menu-query-options";
import "~/features/showcase/showcase.css";

import type { ShowcaseStep } from "@qmenut/ui/theme/showcase";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import type { MenuContentViewModel, MenuDishViewModel } from "~/shared/public-menu/menu-view-model";
import type { PublicMenuData } from "~/shared/public-menu/public-menu-types";

const VIEWS = [214, 138, 96];

interface DressInput {
  content: MenuContentViewModel;
  data: PublicMenuData;
  displayCurrency: string;
  locale: string;
  step: ShowcaseStep;
  t: TFunction;
  tenantName: string;
}

function Callout({ children }: { children: ReactNode }) {
  return <span className="showcase-callout">{children}</span>;
}

function Allergens({ dish, t }: { dish: MenuDishViewModel; t: TFunction }) {
  return (
    <span className="showcase-allergens">
      {dish.allergens?.map((code) => {
        const { Icon } = ALLERGEN_META[code];
        return (
          <QmAllergen key={code} label={t(`allergens.${code}`)}>
            <Icon slot="icon" size={13} strokeWidth={2} />
          </QmAllergen>
        );
      })}
    </span>
  );
}

/** Dresses the real menu for one landing capture step: the badges, notes and prices each step talks about. */
function dressMenu({ content, data, displayCurrency, locale, step, t, tenantName }: DressInput): MenuContentViewModel {
  const [stage] = step.split(":");
  const formatPrice = createPublicPriceFormatter({ data, displayCurrency, locale });
  const vesPrice = createPublicPriceFormatter({
    data: { ...data, vesPricesEnabled: true, vesExchangeRate: step === "rate:1" ? "36.50" : "35.00" },
    displayCurrency: "VES",
    locale,
  });
  const showRate = stage === "rate" && data.sourceCurrency === "USD";
  const categories = data.categories.filter((category) => category.dishes.length > 0);

  if (stage === "stamps") {
    const lead = <ShowcaseLoyalty name={tenantName} installed={step === "stamps:1"} />;
    return { ...content, featured: null, featuredPromo: null, lead, sections: [] };
  }

  const sections = content.sections.map((section, sectionIndex) => ({
    ...section,
    dishes: section.dishes.map((dish, dishIndex): MenuDishViewModel => {
      const raw = categories[sectionIndex]?.dishes[dishIndex];
      const first = sectionIndex === 0;
      if (!raw) return dish;
      if (stage === "soldOut" && first && dishIndex === 0) {
        return { ...dish, badge: { compactText: "Agotado", fullText: "Agotado" }, note: <i data-sold-out /> };
      }
      if (step === "soldOut:1" && first && dishIndex === 1) {
        return { ...dish, oldPrice: undefined, price: formatPrice(raw.price + 100) };
      }
      if (showRate) {
        return {
          ...dish,
          oldPrice: undefined,
          price: formatPrice(raw.price),
          note: <Callout>{vesPrice(raw.price)}</Callout>,
        };
      }
      if (stage === "views" && first && dishIndex < VIEWS.length) {
        return { ...dish, note: <Callout>{VIEWS[dishIndex]} vistas</Callout> };
      }
      if (step === "language:3" && dish.allergens) {
        return { ...dish, note: <Allergens dish={dish} t={t} /> };
      }
      return dish;
    }),
  }));
  const keepFeatured = stage === "domain" || stage === "templates";

  return keepFeatured ? { ...content, sections } : { ...content, featured: null, featuredPromo: null, sections };
}

/** Wraps the menu's own content provider while the landing shows the menu. */
export function ShowcaseMenuContent({ children }: { children: ReactNode }) {
  const content = useMenuContent();
  const step = useShowcaseStep();
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { effectiveLocale, locale } = useRouteContext({ from: "/{-$locale}" });
  const { displayCurrency, tenant } = usePublicRouteLayout();
  const { t } = useTranslation();
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  const dressed = useMemo(
    () =>
      content && data && step
        ? dressMenu({ content, data, displayCurrency, locale: effectiveLocale, step, t, tenantName: tenant.tenantName })
        : content,
    [content, data, displayCurrency, effectiveLocale, step, t, tenant.tenantName],
  );

  return <MenuContentContext.Provider value={dressed}>{children}</MenuContentContext.Provider>;
}
