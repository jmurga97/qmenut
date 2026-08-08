import { QmPromo } from "@qmenut/ui/components/qm-promo/react";
import { QmPromoList } from "@qmenut/ui/components/qm-promo-list/react";

import type { PromosContentViewModel } from "~/features/promos/types/promos-view-model";

interface PromosListProps {
  content: PromosContentViewModel;
}

export function PromosList({ content }: PromosListProps) {
  const emptyLabel = content.promos.length === 0 ? content.emptyLabel : undefined;

  return (
    <QmPromoList value={{ emptyLabel }}>
      {content.promos.map((promo) => (
        <QmPromo key={promo.name} value={promo} />
      ))}
    </QmPromoList>
  );
}
