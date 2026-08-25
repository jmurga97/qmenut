import { QmMenuList } from "@qmenut/ui/components/qm-menu-list/react";
import { useRouteContext, useSearch } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { MenuCategoryNav } from "~/features/menu/components/menu-content/menu-category-nav";
import { MenuFeatured } from "~/features/menu/components/menu-content/menu-featured";
import { MenuSection } from "~/features/menu/components/menu-content/menu-section";
import { MenuDishModal } from "~/features/menu/components/menu-dish-modal";
import { useMenuPage } from "~/features/menu/hooks/use-menu-page";
import { track } from "~/lib/analytics/posthog";
import { runOncePerVisit } from "~/lib/analytics/visit";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

import type { SelectDishInput } from "~/features/menu/types/menu-view-model";

/** TTFB de la carga del documento: el termómetro directo de conexiones lentas en sala. */
function navigationTtfbMs(): number | null {
  const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return entry?.responseStart ? Math.round(entry.responseStart) : null;
}

export function MenuPage() {
  const { t } = useTranslation();
  const dishTriggerRef = useRef<HTMLElement | null>(null);
  const { scrollContainerRef, template, tenant } = usePublicRouteLayout();
  const { fromQr } = useSearch({ from: "/{-$locale}" });
  const { menuLoadMs } = useRouteContext({ from: "/{-$locale}" });
  const { content, selectedDish, setSelectedDish, showDishPhotos } = useMenuPage({
    template,
  });

  // Una sola muestra de TTFB por visita analítica aunque el menú se remonte dentro del mismo documento.
  const ttfbMs = runOncePerVisit("menu_view.ttfb", navigationTtfbMs);

  useTrackPageView("menu_view", {
    ...(ttfbMs !== null && { ttfb_ms: ttfbMs }),
    // Ausente cuando la carta viene de SSR o caché: no se rellena con ceros.
    ...(menuLoadMs !== undefined && { load_ms: menuLoadMs }),
    from_qr: Boolean(fromQr),
  });

  if (!tenant || !content) {
    return null;
  }

  function handleSelectDish({ dish, source, trigger }: SelectDishInput) {
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
        <QmMenuList cascade emptyLabel={t("menu.emptyLabel")} />
      ) : (
        <>
          <MenuFeatured
            featured={content.featured}
            featuredLabel={t(`menu.featuredBadges.${template}`)}
            featuredPromo={content.featuredPromo}
            featuredPromoId={content.featuredPromoId}
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
