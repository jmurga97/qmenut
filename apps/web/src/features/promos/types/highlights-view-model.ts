import type { PromosContentViewModel } from "~/features/promos/types/promos-view-model";
import type { MenuDishViewModel } from "~/shared/public-menu/menu-view-model";

export type RecommendedDishViewModel = MenuDishViewModel;

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
