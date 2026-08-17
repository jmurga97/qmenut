import { QmMenuList } from "@qmenut/ui/components/qm-menu-list/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { MenuCategoryNav } from "~/features/menu/components/menu-content/menu-category-nav";
import { MenuFeatured } from "~/features/menu/components/menu-content/menu-featured";
import { MenuSection } from "~/features/menu/components/menu-content/menu-section";
import { MenuDishModal } from "~/features/menu/components/menu-dish-modal";
import { useMenuPage } from "~/features/menu/hooks/use-menu-page";
import { track } from "~/lib/analytics/posthog";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

export function MenuPage() {
  const { t } = useTranslation();
  const dishTriggerRef = useRef<HTMLElement | null>(null);
  const { scrollContainerRef, template, tenant } = usePublicRouteLayout();
  const { content, selectedDish, setSelectedDish, showDishPhotos } = useMenuPage({
    template,
  });

  useTrackPageView("menu_view");

  if (!tenant || !content) {
    return null;
  }

  function handleSelectDish(dish: MenuDishViewModel, trigger: HTMLButtonElement) {
    dishTriggerRef.current = trigger;
    track("dish_opened", { dish_id: dish.rowKey, dish_name: dish.name });
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
        <QmMenuList cascade emptyLabel={t("menu.emptyLabel")} />
      ) : (
        <>
          <MenuFeatured
            featured={content.featured}
            featuredLabel={t(`menu.featuredBadges.${template}`)}
            featuredPromo={content.featuredPromo}
            showDishPhotos={showDishPhotos}
            onSelectDish={handleSelectDish}
          />
          <MenuCategoryNav scrollContainerRef={scrollContainerRef} sections={content.sections} />
          {content.sections.map((section, index) => (
            <MenuSection
              key={section.id}
              index={index}
              section={section}
              showDishPhotos={showDishPhotos}
              onSelectDish={handleSelectDish}
            />
          ))}
        </>
      )}
      <MenuDishModal dish={selectedDish} onClose={handleCloseDish} />
    </>
  );
}
