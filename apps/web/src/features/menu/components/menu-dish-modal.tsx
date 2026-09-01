import { QmAllergen } from "@qmenut/ui/components/qm-allergen/react";
import { QmDishExtras } from "@qmenut/ui/components/qm-dish-extras/react";
import { QmDishModal } from "@qmenut/ui/components/qm-dish-modal/react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ALLERGEN_META } from "~/features/menu/constants/allergens";
import { photoUrl } from "~/shared/lib/photo-url";

import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

const MODAL_IMAGE_WIDTH_PX = 430;

interface MenuDishModalProps {
  dish: MenuDishViewModel | null;
  onClose: () => void;
  showDishPhoto: boolean;
}

export function MenuDishModal({ dish, onClose, showDishPhoto }: MenuDishModalProps) {
  const { t } = useTranslation();

  if (!dish) {
    return null;
  }

  return (
    <QmDishModal
      open
      name={dish.name}
      photoUrl={showDishPhoto ? photoUrl(dish.photoUrl, MODAL_IMAGE_WIDTH_PX) : undefined}
      photoLabel={t("menu.photoLabel")}
      closeLabel={t("menu.closeLabel")}
      price={dish.price}
      oldPrice={dish.oldPrice}
      tag={dish.badge?.fullText}
      allergensLabel={t("menu.allergensLabel")}
      onQmClose={onClose}
    >
      <X slot="close-icon" size={20} strokeWidth={1.8} />
      {/* Descriptions may contain sanitized rich-text HTML (bold/italic/lists) from the CRM. */}
      {dish.descHtml ? <div dangerouslySetInnerHTML={{ __html: dish.descHtml }} /> : null}
      {dish.extras && dish.extras.length > 0 ? (
        <QmDishExtras slot="extras" label={t("menu.extrasLabel")} items={dish.extras} />
      ) : null}
      {dish.allergens?.map((code) => {
        const { label, Icon } = ALLERGEN_META[code];

        return (
          <QmAllergen key={code} slot="allergens" label={label}>
            <Icon slot="icon" size={13} strokeWidth={2} />
          </QmAllergen>
        );
      })}
    </QmDishModal>
  );
}
