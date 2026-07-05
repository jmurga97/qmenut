import type { AllergenCode } from "~/features/menu/constants/allergens";

export interface MenuDishExtraViewModel {
  name: string;
  price: string;
}

export interface MenuDishViewModel {
  allergens?: AllergenCode[];
  desc: string;
  extras?: MenuDishExtraViewModel[];
  name: string;
  oldPrice?: string;
  photoUrl?: string;
  price: string;
  rowKey: string;
  tag?: string;
}

export interface MenuContentViewModel {
  dishes: MenuDishViewModel[];
  featured: MenuDishViewModel;
  heroLabel: string;
  logoLabel: string;
  sectionCount: string;
  sectionLabel: string;
  sectionNum: string;
  sectionTagline: string;
}
