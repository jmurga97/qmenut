import { QmDishRow } from "@qmenut/ui/components/qm-dish-row/react";
import { QmMenuList } from "@qmenut/ui/components/qm-menu-list/react";
import { QmSectionHeader } from "@qmenut/ui/components/qm-section-header/react";

import { menuSectionElementId } from "~/features/menu/components/menu-section-id";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { getPhotoLayout } from "~/shared/lib/photo-layout";
import { responsivePhotoSource } from "~/shared/lib/photo-url";

import type { MenuSectionViewModel, SelectDishInput } from "~/shared/public-menu/menu-view-model";

interface MenuSectionProps {
  index: number;
  onSelectDish: (input: SelectDishInput) => void;
  section: MenuSectionViewModel;
  showDishPhotos: boolean;
}

export function MenuSection({ index, onSelectDish, section, showDishPhotos }: MenuSectionProps) {
  const layout = usePublicRouteLayout();
  const photoLayout = getPhotoLayout(layout).thumbnail;

  return (
    <section
      id={menuSectionElementId(index)}
      aria-label={section.label}
      className="menu-section-frame"
      data-menu-section={section.id}
    >
      <QmMenuList>
        <QmSectionHeader
          slot="section-header"
          num={section.num}
          tagline={section.tagline}
          sectionLabel={section.label}
          sectionCount={section.count}
        />
        {section.dishes.map((dish) => {
          const source = responsivePhotoSource({
            canonicalUrl: dish.photoUrl,
            ...photoLayout,
            variants: dish.photoVariants,
          });

          return (
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
                  photoUrl: source?.src,
                  photoFallbackUrl: dish.photoUrl,
                  photoSrcSet: source?.srcSet,
                  photoSizes: source?.sizes,
                  price: dish.price,
                  tag: dish.badge?.compactText,
                }}
              />
            </button>
          );
        })}
      </QmMenuList>
    </section>
  );
}
