import type { QmFeaturedValue } from "@qmenut/ui/components/qm-featured/react";
import type { AllergenCode } from "~/features/menu/constants/allergens";

export interface MenuDishExtraViewModel {
  name: string;
  price: string;
}

export interface MenuDishBadgeViewModel {
  compactText: string;
  fullText: string;
}

export interface MenuDishViewModel {
  allergens?: AllergenCode[];
  badge?: MenuDishBadgeViewModel;
  desc: string;
  descHtml: string;
  extras?: MenuDishExtraViewModel[];
  featured: boolean;
  name: string;
  oldPrice?: string;
  photoUrl?: string;
  price: string;
  rowKey: string;
}

/** Desde qué superficie de la carta se abrió un plato (descubrimiento destacado vs navegación). */
export type DishOpenSource = "featured" | "section";

export interface SelectDishInput {
  dish: MenuDishViewModel;
  source: DishOpenSource;
  trigger: HTMLButtonElement;
}

export interface MenuSectionViewModel {
  count: string;
  dishes: MenuDishViewModel[];
  id: string;
  label: string;
  num: string;
  tagline: string;
}

export interface MenuContentViewModel {
  featured: MenuDishViewModel | null;
  featuredPromo: QmFeaturedValue | null;
  /** ID estable de la promoción destacada para analítica; null si no hay o es legado. */
  featuredPromoId: string | null;
  heroLabel: string;
  logoLabel: string;
  sections: MenuSectionViewModel[];
}
