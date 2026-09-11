import { resolvePromotionPrice } from "~/shared/public-menu/promotion-formatting";

import type { QmFeaturedValue } from "@qmenut/ui/components/qm-featured/react";
import type { TFunction } from "i18next";
import type { PublicMenuData, PublicMenuPromotion } from "~/shared/public-menu/public-menu-types";

export function mapPromotionToFeatured({
  data,
  formatPrice,
  promotion,
  t,
}: {
  data: PublicMenuData;
  formatPrice: (cents: number) => string;
  promotion: PublicMenuPromotion;
  t: TFunction;
}): QmFeaturedValue {
  const { oldPrice, price } = resolvePromotionPrice({ data, formatPrice, promotion });

  return {
    desc: promotion.description ?? t(`promos.types.${promotion.type}`),
    name: promotion.name,
    oldPrice,
    photo: false,
    photoUrl: undefined,
    price: price ?? "",
    tag: promotion.name,
  };
}
