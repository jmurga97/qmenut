import { QmDishRow } from "@qmenut/ui/components/qm-dish-row/react";
import { QmMenuList } from "@qmenut/ui/components/qm-menu-list/react";
import { QmSectionHeader } from "@qmenut/ui/components/qm-section-header/react";

import { menuSectionElementId } from "~/features/menu/components/menu-section-id";
import { photoUrl } from "~/shared/lib/photo-url";

import type { MenuSectionViewModel, SelectDishInput } from "~/features/menu/types/menu-view-model";

const DISH_THUMB_WIDTH_PX = 60;

interface MenuSectionProps {
  index: number;
  onSelectDish: (input: SelectDishInput) => void;
  section: MenuSectionViewModel;
  showDishPhotos: boolean;
}

export function MenuSection({ index, onSelectDish, section, showDishPhotos }: MenuSectionProps) {
  return (
    <section
      id={menuSectionElementId(index)}
      aria-label={section.label}
      className="menu-section-frame"
      data-menu-section={section.id}
    >
      <QmMenuList cascade cascadeIndex={index}>
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
            onClick={(event) => onSelectDish({ dish, source: "section", trigger: event.currentTarget })}
          >
            <QmDishRow
              value={{
                desc: dish.desc,
                name: dish.name,
                oldPrice: dish.oldPrice,
                photo: showDishPhotos,
                photoUrl: photoUrl(dish.photoUrl, DISH_THUMB_WIDTH_PX),
                price: dish.price,
                tag: dish.badge?.compactText,
              }}
            />
          </button>
        ))}
      </QmMenuList>
    </section>
  );
}
