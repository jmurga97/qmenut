import { useRef } from "react";

import { MenuCategoryNav } from "~/features/menu/components/menu-category-nav";
import { MenuDishList } from "~/features/menu/components/menu-dish-list";
import { MenuDishModal } from "~/features/menu/components/menu-dish-modal";
import { useMenuPage } from "~/features/menu/hooks/use-menu-page";
import { track } from "~/lib/analytics/posthog";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { ScrollCompactHeroHeader } from "~/shared/components/scroll-compact-hero-header";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { TenantNotFound } from "~/shared/components/tenant-not-found";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";
import { photoUrl } from "~/shared/lib/photo-url";

import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

const HERO_IMAGE_WIDTH_PX = 430;

export function MenuPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dishTriggerRef = useRef<HTMLElement | null>(null);
  const { tenant } = usePublicTenant();
  const { template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLocale();
  const { content, selectedDish, setSelectedDish, showDishPhotos, useHeroHeader } = useMenuPage({
    template,
  });

  useTrackPageView("menu_view");

  if (!tenant || !content) {
    return <TenantNotFound />;
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
    <PublicPageShell
      tenant={tenant}
      template={template}
      overlay={<MenuDishModal dish={selectedDish} onClose={handleCloseDish} />}
    >
      {useHeroHeader ? (
        <ScrollCompactHeroHeader
          scrollContainerRef={scrollRef}
          heroLabel={content.heroLabel}
          name={tenant.tenantName}
          tagline={tenant.tenantTagline}
          langValue={lang}
          langOptions={langOptions}
          langLabel={langLabel}
          logoLabel={content.logoLabel}
          onQmChange={handleLanguageChange}
        >
          <img
            slot="photo"
            src={photoUrl(tenant.heroPhotoUrl, HERO_IMAGE_WIDTH_PX)}
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </ScrollCompactHeroHeader>
      ) : (
        <ScrollHidePageHeader
          scrollContainerRef={scrollRef}
          topbarBrand={tenant.tenantName}
          title={tenant.tenantName}
          subtitle={tenant.tenantTagline}
          langValue={lang}
          langOptions={langOptions}
          langLabel={langLabel}
          titleSize="lg"
          onQmChange={handleLanguageChange}
        />
      )}

      <div className="home-scroll" ref={scrollRef}>
        <MenuDishList
          categoryNav={<MenuCategoryNav scrollContainerRef={scrollRef} sections={content.sections} />}
          content={content}
          showDishPhotos={showDishPhotos}
          onSelectDish={handleSelectDish}
        />
      </div>
    </PublicPageShell>
  );
}
