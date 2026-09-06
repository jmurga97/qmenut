import { QmMenuList } from "@qmenut/ui/components/qm-menu-list/react";
import { useSearch } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { MenuCategoryNav } from "~/features/menu/components/menu-content/menu-category-nav";
import { MenuFeatured } from "~/features/menu/components/menu-content/menu-featured";
import { MenuSection } from "~/features/menu/components/menu-content/menu-section";
import { MenuDishModal, preloadDishModal } from "~/features/menu/components/menu-dish-modal";
import { useMenuContent } from "~/features/menu/hooks/menu-content-context";
import { track } from "~/lib/analytics/posthog";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

import type { MenuDishViewModel, SelectDishInput } from "~/features/menu/types/menu-view-model";

export function MenuPage() {
  const { t } = useTranslation();
  const dishTriggerRef = useRef<HTMLElement | null>(null);
  const [selectedDish, setSelectedDish] = useState<MenuDishViewModel | null>(null);
  const { scrollContainerRef, template, tenant } = usePublicRouteLayout();
  const { utm_source: utmSource } = useSearch({ from: "/{-$locale}" });
  const content = useMenuContent();

  useTrackPageView("menu_view", {
    from_qr: utmSource === "qr",
  });

  if (!tenant || !content) {
    return null;
  }

  function handleSelectDish({ dish, source, trigger }: SelectDishInput) {
    preloadDishModal();
    dishTriggerRef.current = trigger;
    track("dish_opened", { dish_id: dish.rowKey, dish_name: dish.name, source });
    setSelectedDish(dish);
  }

  function handleCloseDish() {
    const trigger = dishTriggerRef.current;
    setSelectedDish(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    });
  }

  return (
    <>
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
            onDishIntent={preloadDishModal}
          />
          <MenuCategoryNav scrollContainerRef={scrollContainerRef} sections={content.sections} />
          {content.sections.map((section, index) => (
            <MenuSection
              key={section.id}
              index={index}
              section={section}
              showDishPhotos={tenant.showMenuPhotos}
              onSelectDish={handleSelectDish}
              onDishIntent={preloadDishModal}
            />
          ))}
        </>
      )}
      <MenuDishModal dish={selectedDish} showDishPhoto={tenant.showDishPhoto} onClose={handleCloseDish} />
    </>
  );
}
