import type { PromosContentViewModel } from "~/features/promos/types/promos-view-model";

interface PromosListProps {
  content: PromosContentViewModel;
}

export function PromosList({ content }: PromosListProps) {
  return (
    <qm-promo-list emptyLabel={content.emptyLabel}>
      {content.promos.map((promo) => (
        <qm-promo
          key={promo.name}
          discount={promo.discount}
          name={promo.name}
          desc={promo.desc}
          price={promo.price}
          oldPrice={promo.oldPrice}
          vigencia={promo.vigencia}
        />
      ))}
    </qm-promo-list>
  );
}
