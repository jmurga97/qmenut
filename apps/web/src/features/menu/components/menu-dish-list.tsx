import { QmDishRow } from "@qmenut/ui/components/qm-dish-row/react";
import { QmFeatured } from "@qmenut/ui/components/qm-featured/react";
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
          <QmDishRow
            value={{
              desc: dish.desc,
              name: dish.name,
              oldPrice: dish.oldPrice,
              photo: showDishPhotos,
              photoUrl: dish.photoUrl,
              price: dish.price,
              tag: dish.tag,
            }}
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
          <QmFeatured
            value={{
              desc: featured.desc,
              name: featured.name,
              oldPrice: featured.oldPrice,
              photo: showDishPhotos,
              photoUrl: featured.photoUrl,
              price: featured.price,
              tag: featured.tag,
            }}
          />
        </button>
      ) : null}
      {content.featuredPromo ? (
        <div className="menu-featured-frame">
          <QmFeatured value={content.featuredPromo} />
        </div>
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
