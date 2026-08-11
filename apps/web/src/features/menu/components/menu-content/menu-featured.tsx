import { QmFeatured } from "@qmenut/ui/components/qm-featured/react";

import { photoUrl } from "~/shared/lib/photo-url";

import type { QmFeaturedValue } from "@qmenut/ui/components/qm-featured/react";
import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

const FEATURED_IMAGE_WIDTH_PX = 430;

interface MenuFeaturedProps {
  featured: MenuDishViewModel | null;
  featuredPromo: QmFeaturedValue | null;
  onSelectDish: (dish: MenuDishViewModel, trigger: HTMLButtonElement) => void;
  showDishPhotos: boolean;
}

export function MenuFeatured({ featured, featuredPromo, onSelectDish, showDishPhotos }: MenuFeaturedProps) {
  return (
    <>
      {featured ? (
        <button
          type="button"
          className="dish-trigger menu-featured-frame public-route-content-stage"
          onClick={(event) => onSelectDish(featured, event.currentTarget)}
        >
          <QmFeatured
            value={{
              desc: featured.desc,
              name: featured.name,
              oldPrice: featured.oldPrice,
              photo: showDishPhotos,
              photoUrl: photoUrl(featured.photoUrl, FEATURED_IMAGE_WIDTH_PX),
              price: featured.price,
              tag: featured.tag,
            }}
          />
        </button>
      ) : null}
      {featuredPromo ? (
        <div className="public-route-content-stage">
          <QmFeatured value={featuredPromo} />
        </div>
      ) : null}
    </>
  );
}
