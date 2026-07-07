import { useRef } from "react";

import { MenuDishList } from "~/features/menu/components/menu-dish-list";
import { MenuDishModal } from "~/features/menu/components/menu-dish-modal";
import { useMenuPage } from "~/features/menu/hooks/use-menu-page";
import { track } from "~/lib/analytics/posthog";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { DevTemplateSwitcher } from "~/shared/components/dev-template-switcher";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { ScrollCompactHeroHeader } from "~/shared/components/scroll-compact-hero-header";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { TenantNotFound } from "~/shared/components/tenant-not-found";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

export function MenuPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tenant } = usePublicTenant();
  const { setTemplate, template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLocale();
  const { content, selectedDish, setSelectedDish, showDishPhotos, useHeroHeader } = useMenuPage({
    template,
  });

  useTrackPageView("menu_view");

  if (!tenant || !content) {
    return <TenantNotFound />;
  }

  function handleSelectDish(dish: MenuDishViewModel | null) {
    if (dish) {
      track("dish_opened", { dish_id: dish.rowKey, dish_name: dish.name });
    }

    setSelectedDish(dish);
  }

  return (
    <>
      <PublicPageShell
        tenant={tenant}
        template={template}
        overlay={<MenuDishModal dish={selectedDish} onClose={() => setSelectedDish(null)} />}
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
            <img slot="photo" src={tenant.heroPhotoUrl} alt="" />
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
          <MenuDishList content={content} showDishPhotos={showDishPhotos} onSelectDish={handleSelectDish} />
        </div>
      </PublicPageShell>
      <DevTemplateSwitcher currentTemplate={template} onSelectTemplate={setTemplate} />
    </>
  );
}
