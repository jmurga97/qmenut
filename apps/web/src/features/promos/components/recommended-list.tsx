import { QmDishRow } from "@qmenut/ui/components/qm-dish-row/react";
import { QmRecommendedList } from "@qmenut/ui/components/qm-recommended-list/react";

import { photoUrl } from "~/shared/lib/photo-url";

import type { RecommendedContentViewModel } from "~/features/promos/types/highlights-view-model";

const DISH_THUMB_WIDTH_PX = 60;

interface RecommendedListProps {
  content: RecommendedContentViewModel;
  showDishPhotos: boolean;
}

export function RecommendedList({ content, showDishPhotos }: RecommendedListProps) {
  const emptyLabel = content.dishes.length === 0 ? content.emptyLabel : undefined;

  return (
    <QmRecommendedList value={{ emptyLabel }}>
      {content.dishes.map((dish) => (
        <QmDishRow
          key={dish.rowKey}
          value={{
            desc: dish.desc,
            featured: dish.featured,
            name: dish.name,
            oldPrice: dish.oldPrice,
            photo: showDishPhotos,
            photoUrl: photoUrl(dish.photoUrl, DISH_THUMB_WIDTH_PX),
            price: dish.price,
            tag: dish.badge?.compactText,
          }}
        />
      ))}
    </QmRecommendedList>
  );
}
