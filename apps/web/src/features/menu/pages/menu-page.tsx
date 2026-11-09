import { QmMenuList } from "@qmenut/ui/components/qm-menu-list/react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { MenuCategoryNav } from "~/features/menu/components/menu-content/menu-category-nav";
import { MenuFeatured } from "~/features/menu/components/menu-content/menu-featured";
import { MenuSection } from "~/features/menu/components/menu-content/menu-section";
import { track } from "~/lib/analytics/posthog";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { useMenuContent } from "~/shared/public-menu/menu-content-context";
import { MenuDishModal } from "~/shared/public-menu/menu-dish-modal";
import { useDishParam } from "~/shared/public-menu/use-dish-param";

import type { SelectDishInput } from "~/shared/public-menu/menu-view-model";

export function MenuPage() {
  const { t } = useTranslation();
  const { scrollContainerRef, template, tenant } = usePublicRouteLayout();
  const { utm_source: utmSource } = useSearch({ from: "/{-$locale}" });
  const content = useMenuContent();
  const dishes = content ? [content.featured, ...content.sections.flatMap((section) => section.dishes)] : null;
  const dishParam = useDishParam(dishes?.filter((dish) => dish !== null) ?? null);

  useTrackPageView("menu_view", {
    from_qr: utmSource === "qr",
  });

  if (!tenant || !content) {
    return null;
  }

  function handleSelectDish({ dish, source, trigger }: SelectDishInput) {
    track("dish_opened", { dish_id: dish.rowKey, dish_name: dish.name, source });
    dishParam.open(dish, trigger);
  }

  return (
    <>
      {content.lead}
      {content.sections.length === 0 ? (
        <QmMenuList emptyLabel={t("menu.emptyLabel")} />
      ) : (
        <>
          <MenuFeatured
            featured={content.featured}
            featuredLabel={t(`menu.featuredBadges.${template}`)}
            featuredPromo={content.featuredPromo}
            featuredPromoId={content.featuredPromoId}
            showDishPhotos={tenant.showMenuPhotos}
            onSelectDish={handleSelectDish}
          />
          <MenuCategoryNav scrollContainerRef={scrollContainerRef} sections={content.sections} />
          {content.sections.map((section, index) => (
            <MenuSection
              key={section.id}
              index={index}
              section={section}
              showDishPhotos={tenant.showMenuPhotos}
              onSelectDish={handleSelectDish}
            />
          ))}
        </>
      )}
      <MenuDishModal
        dish={dishParam.dish}
        instantClose={dishParam.instantClose}
        showDishPhoto={tenant.showDishPhoto}
        onClose={dishParam.close}
      />
    </>
  );
}
