import type { MenuDishBadgeViewModel, MenuDishViewModel } from "~/features/menu/types/menu-view-model";
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
  featured: MenuDishViewModel | null;
  promos: PromosContentViewModel;
  recommended: RecommendedContentViewModel;
  subtitle: string;
  title: string;
}
