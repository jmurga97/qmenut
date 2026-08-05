import { defineQmMenuList } from "@qmenut/ui/components/qm-menu-list";
import { useTranslation } from "react-i18next";

import { menuSectionElementId } from "~/features/menu/components/menu-section-id";

import type { ReactNode } from "react";
import type {
  MenuContentViewModel,
  MenuDishViewModel,
  MenuSectionViewModel,
} from "~/features/menu/types/menu-view-model";

defineQmMenuList();

interface MenuDishListProps {
  categoryNav: ReactNode;
  content: MenuContentViewModel;
  onSelectDish: (dish: MenuDishViewModel, trigger: HTMLButtonElement) => void;
  showDishPhotos: boolean;
}

interface MenuSectionProps {
  onSelectDish: (dish: MenuDishViewModel, trigger: HTMLButtonElement) => void;
  section: MenuSectionViewModel;
  showDishPhotos: boolean;
}

// Multi-word Lit props are written as their kebab attributes (old-price, photo-url,
// section-label...) so SSR-rendered values survive hydration; see KebabAttributes in
// @qmenut/ui jsx-types.
function MenuSection({ onSelectDish, section, showDishPhotos }: MenuSectionProps) {
  const { t } = useTranslation();

  return (
    <qm-menu-list empty-label={t("menu.emptyLabel")}>
      <qm-section-header
        slot="section-header"
        num={section.num}
        tagline={section.tagline}
        section-label={section.label}
        section-count={section.count}
      />
      {section.dishes.map((dish) => (
        <button
          key={dish.rowKey}
          type="button"
          className="dish-trigger"
          onClick={(event) => onSelectDish(dish, event.currentTarget)}
        >
          <qm-dish-row
            name={dish.name}
            desc={dish.desc}
            price={dish.price}
            old-price={dish.oldPrice}
            tag={dish.tag}
            photo={showDishPhotos}
            photo-url={dish.photoUrl}
          />
        </button>
      ))}
    </qm-menu-list>
  );
}

export function MenuDishList({ categoryNav, content, onSelectDish, showDishPhotos }: MenuDishListProps) {
  const { t } = useTranslation();

  if (content.sections.length === 0) {
    return <qm-menu-list empty-label={t("menu.emptyLabel")} />;
  }

  const featured = content.featured;

  return (
    <>
      {featured ? (
        <button
          type="button"
          className="dish-trigger menu-featured-frame"
          onClick={(event) => onSelectDish(featured, event.currentTarget)}
        >
          <qm-featured
            name={featured.name}
            desc={featured.desc}
            price={featured.price}
            old-price={featured.oldPrice}
            tag={featured.tag}
            photo={showDishPhotos}
            photo-url={featured.photoUrl}
          />
        </button>
      ) : null}
      {categoryNav}
      {content.sections.map((section, index) => (
        <section
          key={section.id}
          id={menuSectionElementId(index)}
          aria-label={section.label}
          className="menu-section-frame"
          data-menu-section={section.id}
        >
          <MenuSection section={section} showDishPhotos={showDishPhotos} onSelectDish={onSelectDish} />
        </section>
      ))}
    </>
  );
}
