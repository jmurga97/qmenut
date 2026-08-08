import type { QmFeaturedValue } from "@qmenut/ui/components/qm-featured/react";
import type { PromosContentViewModel } from "~/features/promos/types/promos-view-model";

export interface RecommendedDishViewModel {
  desc: string;
  featured: boolean;
  name: string;
  oldPrice?: string;
  photoUrl?: string;
  price: string;
  rowKey: string;
  tag?: string;
}

export interface RecommendedContentViewModel {
  dishes: RecommendedDishViewModel[];
  emptyLabel: string;
}

export interface HighlightsContentViewModel {
  featuredPromo: QmFeaturedValue | null;
  promos: PromosContentViewModel;
  recommended: RecommendedContentViewModel;
  subtitle: string;
  title: string;
}
