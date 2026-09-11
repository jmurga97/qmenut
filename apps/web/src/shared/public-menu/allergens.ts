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

export type AllergenCode =
  | "gluten"
  | "crustaceans"
  | "eggs"
  | "fish"
  | "peanuts"
  | "soybeans"
  | "milk"
  | "nuts"
  | "celery"
  | "mustard"
  | "sesame"
  | "sulphites"
  | "lupin"
  | "molluscs";

export const ALLERGEN_META: Record<AllergenCode, { label: string; Icon: LucideIcon }> = {
  gluten: { label: "Gluten", Icon: Wheat },
  crustaceans: { label: "Crustáceos", Icon: Shrimp },
  eggs: { label: "Huevo", Icon: Egg },
  fish: { label: "Pescado", Icon: Fish },
  peanuts: { label: "Cacahuete", Icon: Sprout },
  soybeans: { label: "Soja", Icon: Bean },
  milk: { label: "Lácteos", Icon: Milk },
  nuts: { label: "Frutos secos", Icon: Nut },
  celery: { label: "Apio", Icon: Leaf },
  mustard: { label: "Mostaza", Icon: Droplet },
  sesame: { label: "Sésamo", Icon: Flower2 },
  sulphites: { label: "Sulfitos", Icon: FlaskConical },
  lupin: { label: "Altramuces", Icon: Flower },
  molluscs: { label: "Moluscos", Icon: Shell },
};
