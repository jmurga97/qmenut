import type { QmFeaturedValue } from "@qmenut/ui/components/qm-featured/react";
import type { MenuDishBadgeViewModel } from "~/features/menu/types/menu-view-model";
import type { PromosContentViewModel } from "~/features/promos/types/promos-view-model";

export interface RecommendedDishViewModel {
  badge?: MenuDishBadgeViewModel;
  desc: string;
  featured: boolean;
  name: string;
  oldPrice?: string;
  photoUrl?: string;
  price: string;
  rowKey: string;
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
