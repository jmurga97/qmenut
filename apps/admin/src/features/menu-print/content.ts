import { formatMoney } from "~/shared/services/money";

import type { RouterOutputs } from "~/lib/trpc";

export type MenuData = NonNullable<RouterOutputs["menu"]["publicData"]>;
export type PrintFormat = "a4" | "folded";
export interface PrintDish {
  id: string;
  name: string;
  price: string;
  description: string;
  details: string[];
  isFeatured: boolean;
  isRecommended: boolean;
  allergens: { code: string }[];
  combo: { description: string; price: string } | null;
}
export interface PrintCategory {
  id: string;
  name: string;
  description: string;
  dishes: PrintDish[];
}

export function toPrintText(html: string | null): string {
  if (!html) return "";
  const separated = html.replaceAll(/<\/(?:p|div|li|ul|ol)>|<br\s*\/?>/gi, "\n");
  const parsed = new DOMParser().parseFromString(separated, "text/html");
  parsed.querySelectorAll("script, style, img").forEach((node) => node.remove());
  return (parsed.body.textContent ?? "").trim();
}

function mapDish(dish: MenuData["categories"][number]["dishes"][number], currency: string): PrintDish {
  const money = (amount: number) => formatMoney(amount, currency);
  const details: string[] = [];
  for (const group of dish.variantGroups) {
    const options = group.options.map(
      (option) => `${option.name} (${option.priceDelta > 0 ? "+" : ""}${money(option.priceDelta)})`,
    );
    details.push(`${group.name}${group.isRequired ? " (obligatorio)" : ""}: ${options.join(" · ")}`);
  }
  return {
    id: dish.id,
    name: dish.name,
    price: money(dish.price),
    description: toPrintText(dish.description),
    details,
    isFeatured: dish.isFeatured,
    isRecommended: dish.isRecommended,
    allergens: dish.allergens,
    combo:
      dish.comboEnabled && dish.comboPrice !== null
        ? { description: toPrintText(dish.comboDescription), price: money(dish.comboPrice) }
        : null,
  };
}

export function getPrintCategories(data: MenuData): PrintCategory[] {
  return data.categories
    .filter((category) => category.dishes.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: toPrintText(category.description),
      dishes: category.dishes.map((dish) => mapDish(dish, data.sourceCurrency)),
    }));
}
