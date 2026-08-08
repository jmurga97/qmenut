import { QmDishRow } from "@qmenut/ui/components/qm-dish-row/react";
import { QmFeatured } from "@qmenut/ui/components/qm-featured/react";
import { QmMenuList } from "@qmenut/ui/components/qm-menu-list/react";
import { QmSectionHeader } from "@qmenut/ui/components/qm-section-header/react";
import { useTranslation } from "react-i18next";

import { menuSectionElementId } from "~/features/menu/components/menu-section-id";
import { photoUrl } from "~/shared/lib/photo-url";

import type { ReactNode } from "react";
import type {
  MenuContentViewModel,
  MenuDishViewModel,
  MenuSectionViewModel,
} from "~/features/menu/types/menu-view-model";

const FEATURED_IMAGE_WIDTH_PX = 430;
const DISH_THUMB_WIDTH_PX = 60;

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
  return (
    <QmMenuList>
      <QmSectionHeader
        slot="section-header"
        num={section.num}
        tagline={section.tagline}
        sectionLabel={section.label}
        sectionCount={section.count}
      />
      {section.dishes.map((dish) => (
        <button
          key={dish.rowKey}
          type="button"
          className="dish-trigger"
          onClick={(event) => onSelectDish(dish, event.currentTarget)}
        >
          <QmDishRow
            name={dish.name}
            desc={dish.desc}
            price={dish.price}
            oldPrice={dish.oldPrice}
            tag={dish.tag}
            photo={showDishPhotos}
            photoUrl={photoUrl(dish.photoUrl, DISH_THUMB_WIDTH_PX)}
          />
        </button>
      ))}
    </QmMenuList>
  );
}

export function MenuDishList({ categoryNav, content, onSelectDish, showDishPhotos }: MenuDishListProps) {
  const { t } = useTranslation();

  if (content.sections.length === 0) {
    return <QmMenuList emptyLabel={t("menu.emptyLabel")} />;
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
            name={featured.name}
            desc={featured.desc}
            price={featured.price}
            oldPrice={featured.oldPrice}
            tag={featured.tag}
            photo={showDishPhotos}
            photoUrl={photoUrl(featured.photoUrl, FEATURED_IMAGE_WIDTH_PX)}
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
