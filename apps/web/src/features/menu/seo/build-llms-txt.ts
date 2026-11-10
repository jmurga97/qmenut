import { minutesToTime } from "~/features/menu/seo/build-restaurant-json-ld";
import { findPriceVariantGroup, stripHtml } from "~/shared/public-menu/map-dish";

import type { PublicMenuData, PublicMenuDish } from "~/shared/public-menu/public-menu-types";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function oneLine(html: string | null | undefined): string {
  return stripHtml(html ?? "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function dishPrices(dish: PublicMenuDish, currency: string): string {
  const format = (cents: number) => `${(cents / 100).toFixed(2)} ${currency}`;
  const group = findPriceVariantGroup(dish);
  if (!group) return format(dish.price);

  return group.options.map((option) => `${option.name} ${format(dish.price + option.priceDelta)}`).join(" / ");
}

/** Plain-Markdown restaurant card for AI assistants: the same facts as the JSON-LD, readable as text. */
export function buildLlmsTxt({ data, origin }: { data: PublicMenuData; origin: string }): string {
  const { branch, categories, sourceCurrency } = data;
  const facts = [
    branch.address && `- Address: ${branch.address}`,
    branch.phone && `- Phone: ${branch.phone}`,
    `- Menu: ${origin}/`,
    `- Contact and opening hours: ${origin}/contacto`,
    data.publicFeatures.reservations && `- Book a table: ${origin}/reservar`,
    `- Languages: ${data.language.available.map((option) => option.label).join(", ")}`,
  ];
  const hours = branch.schedules.map(
    (schedule) =>
      `- ${DAY_NAMES[schedule.dayOfWeek]}: ${minutesToTime(schedule.openMinute)}–${minutesToTime(schedule.closeMinute)}`,
  );
  const menu = categories.flatMap((category) => [
    "",
    `### ${category.name}`,
    ...category.dishes.map((dish) => {
      const description = oneLine(dish.description);
      const line = `- ${dish.name}: ${dishPrices(dish, sourceCurrency)}`;
      return description ? `${line} — ${description}` : line;
    }),
  ]);
  const tagline = oneLine(data.tagline);

  return [
    `# ${branch.name}`,
    ...(tagline ? ["", `> ${tagline}`] : []),
    "",
    ...facts.filter(Boolean),
    ...(hours.length > 0 ? ["", "## Opening hours", "", ...hours] : []),
    ...(menu.length > 0 ? ["", "## Menu", ...menu] : []),
    "",
  ].join("\n");
}
