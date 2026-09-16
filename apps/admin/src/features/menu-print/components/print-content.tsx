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
      {dish.description ? <p>{dish.description}</p> : null}
      {dish.details.map((detail, index) => (
        <p className="menu-print-dish__detail" key={index}>
          {detail}
        </p>
      ))}
    </article>
  );
}
