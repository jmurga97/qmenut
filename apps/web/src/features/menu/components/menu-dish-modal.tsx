import { QmDishModal } from "@qmenut/ui/react";

import { ALLERGEN_META } from "~/features/menu/constants/allergens";

import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

interface MenuDishModalProps {
  dish: MenuDishViewModel | null;
  onClose: () => void;
}

export function MenuDishModal({ dish, onClose }: MenuDishModalProps) {
  return (
    <QmDishModal
      open={dish !== null}
      name={dish?.name ?? ""}
      photoUrl={dish?.photoUrl}
      photoLabel="Foto del plato"
      closeLabel="Cerrar"
      onQmClose={onClose}
    >
      <div>{dish?.desc}</div>
      {dish?.extras && dish.extras.length > 0 ? <qm-dish-extras slot="extras" items={dish.extras} /> : null}
      {dish?.allergens?.map((code) => {
        const { label, Icon } = ALLERGEN_META[code];

        return (
          <qm-allergen key={code} slot="allergens" label={label}>
            <Icon slot="icon" size={13} strokeWidth={2} />
          </qm-allergen>
        );
      })}
    </QmDishModal>
  );
}
