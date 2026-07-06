import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import type {
  MenuContentViewModel,
  MenuDishViewModel,
  MenuSectionViewModel,
} from "~/features/menu/types/menu-view-model";

interface MenuDishListProps {
  content: MenuContentViewModel;
  onSelectDish: (dish: MenuDishViewModel) => void;
  showDishPhotos: boolean;
}

interface MenuSectionProps {
  featured: MenuDishViewModel | null;
  onSelectDish: (dish: MenuDishViewModel) => void;
  section: MenuSectionViewModel;
  showDishPhotos: boolean;
}

// Multi-word Lit props are written as their kebab attributes (old-price, photo-url,
// section-label...) so SSR-rendered values survive hydration; see KebabAttributes in
// @qmenut/ui jsx-types.
function MenuSection({ featured, onSelectDish, section, showDishPhotos }: MenuSectionProps) {
  const { t } = useTranslation();

  return (
    <qm-menu-list empty-label={t("menu.emptyLabel")}>
      {featured ? (
        <button slot="featured" type="button" className="dish-trigger" onClick={() => onSelectDish(featured)}>
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
      <qm-section-header
        slot="section-header"
        num={section.num}
        tagline={section.tagline}
        section-label={section.label}
        section-count={section.count}
      />
      {section.dishes.map((dish) => (
        <button key={dish.rowKey} type="button" className="dish-trigger" onClick={() => onSelectDish(dish)}>
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

export function MenuDishList({ content, onSelectDish, showDishPhotos }: MenuDishListProps) {
  const { t } = useTranslation();

  if (content.sections.length === 0) {
    return <qm-menu-list empty-label={t("menu.emptyLabel")} />;
  }

  return (
    <Fragment>
      {content.sections.map((section, index) => (
        <MenuSection
          key={section.id}
          featured={index === 0 ? content.featured : null}
          section={section}
          showDishPhotos={showDishPhotos}
          onSelectDish={onSelectDish}
        />
      ))}
    </Fragment>
  );
}
