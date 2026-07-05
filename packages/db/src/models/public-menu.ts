import type { PublicBranch } from "./branch";
import type { PublicDishPromotion, PublicPromotion } from "./promotion";
import type { PublicTranslation } from "./translation";

export interface PublicDishAvailabilityWindow {
  dayOfWeek: number;
  endMinute: number;
  id: string;
  startMinute: number;
}

export interface PublicDishVariantOption {
  id: string;
  name: string;
  position: number;
  priceDelta: number;
  translations: PublicTranslation[];
}

export interface PublicDishVariantGroup {
  id: string;
  isRequired: boolean;
  maxSelect: number | null;
  minSelect: number;
  name: string;
  options: PublicDishVariantOption[];
  position: number;
  selectionType: "multiple" | "single";
  translations: PublicTranslation[];
}

export interface PublicTag {
  code: string | null;
  color: string | null;
  id: string;
  isSystem: boolean;
  label: string | null;
}

export interface PublicAllergen {
  code: string;
  id: number;
}

export interface PublicDishExtra {
  id: string;
  name: string;
  position: number;
  price: number;
  translations: PublicTranslation[];
}

export interface PublicDish {
  allergens: PublicAllergen[];
  availabilityWindows: PublicDishAvailabilityWindow[];
  categoryId: string;
  description: string | null;
  extras: PublicDishExtra[];
  id: string;
  imageUrl: string | null;
  isFeatured: boolean;
  isRecommended: boolean;
  name: string;
  position: number;
  price: number;
  promotion: PublicDishPromotion | null;
  tags: PublicTag[];
  translations: PublicTranslation[];
  variantGroups: PublicDishVariantGroup[];
}

export interface PublicCategory {
  description: string | null;
  dishes: PublicDish[];
  id: string;
  imageUrl: string | null;
  name: string;
  position: number;
  translations: PublicTranslation[];
}

export interface PublicMenuData {
  branch: PublicBranch;
  categories: PublicCategory[];
  promotions: PublicPromotion[];
}
