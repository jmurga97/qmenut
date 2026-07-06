import type { AllergenCode } from "~/features/menu/constants/allergens";

export interface MenuDishExtraViewModel {
  name: string;
  price: string;
}

export interface MenuDishViewModel {
  allergens?: AllergenCode[];
  desc: string;
  descHtml: string;
  extras?: MenuDishExtraViewModel[];
  name: string;
  oldPrice?: string;
  photoUrl?: string;
  price: string;
  rowKey: string;
  tag?: string;
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
  heroLabel: string;
  logoLabel: string;
  sections: MenuSectionViewModel[];
}
