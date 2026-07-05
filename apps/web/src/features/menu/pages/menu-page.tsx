import { useRef } from "react";

import { MenuDishList } from "~/features/menu/components/menu-dish-list";
import { MenuDishModal } from "~/features/menu/components/menu-dish-modal";
import { useMenuPage } from "~/features/menu/hooks/use-menu-page";
import { DevTemplateSwitcher } from "~/shared/components/dev-template-switcher";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";
import { ScrollCompactHeroHeader } from "~/shared/components/scroll-compact-hero-header";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { useLanguage } from "~/shared/hooks/use-language";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

export function MenuPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tenant } = usePublicTenant();
  const { setTemplate, template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLanguage();
  const { content, selectedDish, setSelectedDish, showDishPhotos, useHeroHeader } = useMenuPage({ template });

  if (!tenant) {
    return <PublicPageSkeleton />;
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
          <MenuDishList content={content} showDishPhotos={showDishPhotos} onSelectDish={setSelectedDish} />
        </div>
      </PublicPageShell>
      <DevTemplateSwitcher currentTemplate={template} onSelectTemplate={setTemplate} />
    </>
  );
}
