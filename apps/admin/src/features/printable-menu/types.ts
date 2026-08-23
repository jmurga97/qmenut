import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type PublicMenuData = NonNullable<RouterOutputs["menu"]["publicData"]>;
export type PrintableTheme = RouterOutputs["admin"]["theme"]["get"];

export interface PrintableMenuExtra {
  name: string;
  price: string;
}

export interface PrintableMenuVariant {
  name: string;
  options: string;
}

export interface PrintableMenuDish {
  allergens: string[];
  description: string;
  extras: PrintableMenuExtra[];
  name: string;
  oldPrice?: string;
  price: string;
  promotion?: string;
  recommended: boolean;
  tags: string[];
  variants: PrintableMenuVariant[];
}

export interface PrintableMenuCategory {
  description: string;
  dishes: PrintableMenuDish[];
  id: string;
  name: string;
}

export interface PrintableMenuModel {
  accent: string;
  branchName: string;
  categories: PrintableMenuCategory[];
  host: string;
  locale: string;
  logoUrl: string | null;
  menuUrl: string;
  tagline: string;
}
