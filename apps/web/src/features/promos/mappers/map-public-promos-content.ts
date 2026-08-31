import { createPublicPriceFormatter } from "~/features/menu/mappers/create-public-price-formatter";
import { formatDiscount, formatValidity, resolvePromotionPrice } from "~/features/promos/mappers/promotion-formatting";

import type { TFunction } from "i18next";
import type { PublicMenuData, PublicMenuPromotion } from "~/features/menu/api/public-menu-types";
import type { PromoViewModel, PromosContentViewModel } from "~/features/promos/types/promos-view-model";

interface MapPublicPromosContentInput {
  data: PublicMenuData | null;
  displayCurrency: string;
  locale: string;
  t: TFunction;
}

function mapPromotion({
  data,
  formatPrice,
  locale,
  promotion,
  t,
}: {
  data: PublicMenuData;
  formatPrice: (cents: number) => string;
  locale: string;
  promotion: PublicMenuPromotion;
  t: TFunction;
}): PromoViewModel {
  const { oldPrice, price } = resolvePromotionPrice({ data, formatPrice, promotion });

  return {
    desc: promotion.description ?? t(`promos.types.${promotion.type}`),
    discount: formatDiscount(promotion, t),
    name: promotion.name,
    oldPrice,
    price,
    vigencia: formatValidity({ locale, promotion, t }),
  };
}

export function mapPublicPromosContent({
  data,
  displayCurrency,
  locale,
  t,
}: MapPublicPromosContentInput): PromosContentViewModel {
  if (!data) {
    return {
      emptyLabel: t("promos.page.emptyLabel"),
      promos: [],
      title: t("promos.page.title"),
    };
  }

  const formatPrice = createPublicPriceFormatter({ data, displayCurrency, locale });

  return {
    emptyLabel: t("promos.page.emptyLabel"),
    promos: data.promotions.map((promotion) => mapPromotion({ data, formatPrice, locale, promotion, t })),
    title: t("promos.page.title"),
  };
}
