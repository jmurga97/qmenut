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
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export const ALLERGEN_ICONS: Record<string, LucideIcon | undefined> = {
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
  celery: "Apio",
  crustaceans: "Crustáceos",
  eggs: "Huevos",
  fish: "Pescado",
  gluten: "Gluten",
  lupin: "Altramuces",
  milk: "Leche",
  molluscs: "Moluscos",
  mustard: "Mostaza",
  nuts: "Frutos de cáscara",
  peanuts: "Cacahuetes",
  sesame: "Sésamo",
  soybeans: "Soja",
  sulphites: "Sulfitos",
};

export function toAllergenDisplayLabel(code: string) {
  return ALLERGEN_LABELS[code] ?? code;
}
