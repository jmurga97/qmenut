import { QmDishRow } from "@qmenut/ui/components/qm-dish-row/react";
import { QmRecommendedList } from "@qmenut/ui/components/qm-recommended-list/react";

import type { RecommendedContentViewModel } from "~/features/promos/types/highlights-view-model";

interface RecommendedListProps {
  content: RecommendedContentViewModel;
  showDishPhotos: boolean;
}

export function RecommendedList({ content, showDishPhotos }: RecommendedListProps) {
  return (
    <QmRecommendedList value={{ emptyLabel: content.emptyLabel }}>
      {content.dishes.map((dish) => (
        <QmDishRow
          key={dish.rowKey}
          value={{
            desc: dish.desc,
            featured: dish.featured,
            name: dish.name,
            oldPrice: dish.oldPrice,
            photo: showDishPhotos,
            photoUrl: dish.photoUrl,
            price: dish.price,
            tag: dish.tag,
          }}
        />
      ))}
    </QmRecommendedList>
  );
}
