import { QmFeatured } from "@qmenut/ui/components/qm-featured/react";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";

import { track } from "~/lib/analytics/posthog";
import { photoUrl } from "~/shared/lib/photo-url";

import type { QmFeaturedValue } from "@qmenut/ui/components/qm-featured/react";
import type { MenuDishViewModel, SelectDishInput } from "~/features/menu/types/menu-view-model";

const FEATURED_IMAGE_WIDTH_PX = 430;

interface MenuFeaturedProps {
  featured: MenuDishViewModel | null;
  featuredLabel: string;
  featuredPromo: QmFeaturedValue | null;
  featuredPromoId: string | null;
  onSelectDish: (input: SelectDishInput) => void;
  showDishPhotos: boolean;
}

export function MenuFeatured({
  featured,
  featuredLabel,
  featuredPromo,
  featuredPromoId,
  onSelectDish,
  showDishPhotos,
}: MenuFeaturedProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const search = useSearch({ from: "/{-$locale}" });

  function preloadHighlights() {
    void router.preloadRoute({
      to: "/{-$locale}/destacados",
      params: (prev) => prev,
      search,
    });
  }

  function handlePromoSelect() {
    track("promo_opened", { name: featuredPromo?.name, promotion_id: featuredPromoId, source: "featured" });
    void navigate({ to: "/{-$locale}/destacados", params: (prev) => prev, search });
  }

  return (
    <>
      {featured ? (
        <button
          type="button"
          className="dish-trigger menu-featured-frame public-route-content-stage"
          onClick={(event) => onSelectDish({ dish: featured, source: "featured", trigger: event.currentTarget })}
        >
          <QmFeatured
            value={{
              desc: featured.desc,
              name: featured.name,
              oldPrice: featured.oldPrice,
              photo: showDishPhotos,
              photoUrl: photoUrl(featured.photoUrl, FEATURED_IMAGE_WIDTH_PX),
              price: featured.price,
              secondaryTag: featured.featured ? featuredLabel : undefined,
              tag: featured.badge?.compactText,
            }}
          />
        </button>
      ) : null}
      {featuredPromo ? (
        <button
          type="button"
          className="dish-trigger public-route-content-stage"
          onPointerEnter={preloadHighlights}
          onFocus={preloadHighlights}
          onTouchStart={preloadHighlights}
          onClick={handlePromoSelect}
        >
          <QmFeatured value={featuredPromo} />
        </button>
      ) : null}
    </>
  );
}
