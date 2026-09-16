import { Icon } from "~/shared/components/icon";
import { ALLERGEN_ICONS, toAllergenDisplayLabel } from "~/shared/services/allergens";

import type { PrintCategory, PrintDish } from "../content";

export function PrintCategoryHeading({ category }: { category: PrintCategory }) {
  return (
    <div className="menu-print-category">
      <h3>{category.name}</h3>
      {category.description ? <p>{category.description}</p> : null}
    </div>
  );
}

export function PrintDishRow({ dish }: { dish: PrintDish }) {
  return (
    <article className="menu-print-dish">
      <div className="menu-print-dish__name">
        <h4>{dish.name}</h4>
        <span>{dish.price}</span>
      </div>
      <div className="menu-print-dish__body">
        {dish.isFeatured || dish.isRecommended ? (
          <div className="menu-print-dish__badges">
            {dish.isFeatured ? (
              <span>
                <Icon name="loyalty" /> Favorito
              </span>
            ) : null}
            {dish.isRecommended ? (
              <span>
                <Icon name="star" /> Recomendado
              </span>
            ) : null}
          </div>
        ) : null}
        {dish.description ? <p>{dish.description}</p> : null}
        {dish.combo ? (
          <p className="menu-print-dish__detail">
            <strong>Combo:</strong> {dish.combo.description}
            {dish.combo.description ? " · " : ""}
            <span className="menu-print-dish__combo-price">{dish.combo.price}</span>
          </p>
        ) : null}
        {dish.details.map((detail, index) => (
          <p className="menu-print-dish__detail" key={index}>
            {detail}
          </p>
        ))}
        {dish.allergens.length > 0 ? (
          <div className="menu-print-dish__allergens menu-print-dish__detail" role="group" aria-label="Alérgenos">
            <strong>Alérgenos:</strong>
            {dish.allergens.map(({ code }) => {
              const AllergenIcon = ALLERGEN_ICONS[code];
              const label = toAllergenDisplayLabel(code);
              return AllergenIcon ? (
                <span key={code} role="img" aria-label={label} title={label}>
                  <AllergenIcon aria-hidden="true" />
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
