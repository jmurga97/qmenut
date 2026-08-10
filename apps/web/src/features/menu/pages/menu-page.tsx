import { useRef } from "react";

import { MenuCategoryNav } from "~/features/menu/components/menu-category-nav";
import { MenuDishList } from "~/features/menu/components/menu-dish-list";
import { MenuDishModal } from "~/features/menu/components/menu-dish-modal";
import { useMenuPage } from "~/features/menu/hooks/use-menu-page";
import { track } from "~/lib/analytics/posthog";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

export function MenuPage() {
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
      <MenuDishList
        categoryNav={<MenuCategoryNav scrollContainerRef={scrollContainerRef} sections={content.sections} />}
        content={content}
        showDishPhotos={showDishPhotos}
        onSelectDish={handleSelectDish}
      />
      <MenuDishModal dish={selectedDish} onClose={handleCloseDish} />
    </>
  );
}
