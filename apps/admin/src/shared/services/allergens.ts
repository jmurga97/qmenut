import {
  Bean,
  Droplet,
  Egg,
  Fish,
  FlaskConical,
  Flower,
  Flower2,
  Leaf,
  Milk,
  Nut,
  Shell,
  Shrimp,
  Sprout,
  Wheat,
} from "@qmenut/ui/icons";

import { i18n } from "~/lib/i18n";

import type { QmIcon } from "@qmenut/ui/icons";

export const ALLERGEN_ICONS: Record<string, QmIcon | undefined> = {
  gluten: Wheat,
  crustaceans: Shrimp,
  eggs: Egg,
  fish: Fish,
  peanuts: Sprout,
  soybeans: Bean,
  milk: Milk,
  nuts: Nut,
  celery: Leaf,
  mustard: Droplet,
  sesame: Flower2,
  sulphites: FlaskConical,
  lupin: Flower,
  molluscs: Shell,
};

const ALLERGEN_LABELS: Record<string, string> = {
  celery: i18n.t("shared___Apio"),
  crustaceans: i18n.t("shared___Crustáceos"),
  eggs: i18n.t("shared___Huevos"),
  fish: i18n.t("shared___Pescado"),
  gluten: i18n.t("shared___Gluten"),
  lupin: i18n.t("shared___Altramuces"),
  milk: i18n.t("shared___Leche"),
  molluscs: i18n.t("shared___Moluscos"),
  mustard: i18n.t("shared___Mostaza"),
  nuts: i18n.t("shared___Frutos de cáscara"),
  peanuts: i18n.t("shared___Cacahuetes"),
  sesame: i18n.t("shared___Sésamo"),
  soybeans: i18n.t("shared___Soja"),
  sulphites: i18n.t("shared___Sulfitos"),
};

export function toAllergenDisplayLabel(code: string) {
  return ALLERGEN_LABELS[code] ?? code;
}
