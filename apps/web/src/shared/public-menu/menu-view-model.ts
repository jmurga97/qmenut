import type { PublicImageVariant } from "@qmenut/db/models/image";
import type { QmFeaturedValue } from "@qmenut/ui/components/qm-featured/react";
import type { DishOpenSource } from "~/lib/analytics/event-catalog";
import type { AllergenCode } from "~/shared/public-menu/allergens";

export type { DishOpenSource };

export interface MenuDishExtraViewModel {
  name: string;
  price: string;
}

/** A labelled variant price (e.g. "15 cm" · "4,50 €"), shown as a column. */
export interface MenuDishPriceViewModel {
  label: string;
  oldValue?: string;
  value: string;
}

export interface MenuDishBadgeViewModel {
  compactText: string;
  fullText: string;
}

export interface MenuDishViewModel {
  allergens?: AllergenCode[];
  badge?: MenuDishBadgeViewModel;
  comboDescription?: string;
  comboLabel?: string;
  comboPrice?: string;
  desc: string;
  descHtml: string;
  extras?: MenuDishExtraViewModel[];
  featured: boolean;
  name: string;
  oldPrice?: string;
  photoUrl?: string;
  photoVariants?: PublicImageVariant[];
  price: string;
  /** First two variants; replaces `price` in rows, cards and the modal header. */
  prices?: MenuDishPriceViewModel[];
  rowKey: string;
  /** Every variant, only when there are more than the two `prices` show. */
  variantList?: { items: MenuDishExtraViewModel[]; label: string };
}

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
