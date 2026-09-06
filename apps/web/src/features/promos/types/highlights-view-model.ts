import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";
import type { PromosContentViewModel } from "~/features/promos/types/promos-view-model";

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
