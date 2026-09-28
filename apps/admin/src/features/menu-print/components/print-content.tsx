import { i18n } from "~/lib/i18n";
import { ALLERGEN_ICONS, toAllergenDisplayLabel } from "~/shared/services/allergens";

import type { PrintCategory, PrintDish } from "../content";

export function PrintCategoryHeading({ category }: { category: PrintCategory }) {
  return (
    <div className={"menu-print-category"}>
      <h3>{category.name}</h3>
      {category.description ? <p>{category.description}</p> : null}
    </div>
  );
}

export function PrintDishRow({ dish }: { dish: PrintDish }) {
  return (
    <article className={"menu-print-dish"}>
      <div className={"menu-print-dish__name"}>
        <h4>{dish.name}</h4>
        <span>{dish.price}</span>
      </div>
      <div className={"menu-print-dish__body"}>
        {dish.isFeatured || dish.isRecommended ? (
          <div className={"menu-print-dish__badges"}>
            {dish.isFeatured ? <span>{i18n.t("menuPrint___Favorito")}</span> : null}
            {dish.isRecommended ? <span>{i18n.t("menuPrint___Recomendado")}</span> : null}
          </div>
        ) : null}
        {dish.description ? <p>{dish.description}</p> : null}
        {dish.combo ? (
          <p className={"menu-print-dish__detail"}>
            <strong>{i18n.t("menuPrint___Combo:")}</strong> {dish.combo.description}
            {dish.combo.description ? " · " : ""}
            <span className={"menu-print-dish__combo-price"}>{dish.combo.price}</span>
          </p>
        ) : null}
        {dish.details.map((detail, index) => (
          <p className={"menu-print-dish__detail"} key={index}>
            {detail}
          </p>
        ))}
        {dish.allergens.length > 0 ? (
          <div
            className={"menu-print-dish__allergens menu-print-dish__detail"}
            role={"group"}
            aria-label={i18n.t("menuPrint___Alérgenos")}
          >
            <strong>{i18n.t("menuPrint___Alérgenos:")}</strong>
            {dish.allergens.map(({ code }) => {
              const AllergenIcon = ALLERGEN_ICONS[code];
              const label = toAllergenDisplayLabel(code);
              return AllergenIcon ? (
                <span key={code} role={"img"} aria-label={label} title={label}>
                  <AllergenIcon aria-hidden={"true"} />
                </span>
              ) : (
                <span key={code}>{label}</span>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}
