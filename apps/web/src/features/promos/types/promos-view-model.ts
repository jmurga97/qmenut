import type { QmPromoValue } from "@qmenut/ui/components/qm-promo/react";

export type PromoViewModel = QmPromoValue;

export interface PromosContentViewModel {
  emptyLabel: string;
  promos: PromoViewModel[];
  subtitle: string;
  title: string;
}
