import { QmDishRow } from "@qmenut/ui/components/qm-dish-row/react";
import { QmRecommendedList } from "@qmenut/ui/components/qm-recommended-list/react";

import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { getPhotoLayout } from "~/shared/lib/photo-layout";
import { responsivePhotoSource } from "~/shared/lib/photo-url";

import type {
  RecommendedContentViewModel,
  RecommendedDishViewModel,
} from "~/features/promos/types/highlights-view-model";

interface RecommendedListProps {
  content: RecommendedContentViewModel;
  onSelectDish: (dish: RecommendedDishViewModel, trigger: HTMLButtonElement) => void;
  showDishPhotos: boolean;
}

export function RecommendedList({ content, onSelectDish, showDishPhotos }: RecommendedListProps) {
  const emptyLabel = content.dishes.length === 0 ? content.emptyLabel : undefined;

  const layout = usePublicRouteLayout();
  const photoLayout = getPhotoLayout(layout).thumbnail;

  return (
    <QmRecommendedList value={{ emptyLabel }}>
      {content.dishes.map((dish) => {
        const source = responsivePhotoSource({
          canonicalUrl: dish.photoUrl,
          ...photoLayout,
          variants: dish.photoVariants,
        });

        return (
          <button
            className="dish-trigger"
            key={dish.rowKey}
            onClick={(event) => onSelectDish(dish, event.currentTarget)}
            type="button"
          >
            <QmDishRow
              value={{
                desc: dish.desc,
                featured: dish.featured,
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
    </QmRecommendedList>
  );
}
