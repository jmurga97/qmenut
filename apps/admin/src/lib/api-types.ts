import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type AdminTenant = RouterOutputs["admin"]["tenant"]["me"];
export type AdminBranch = AdminTenant["branches"][number];
export type DishDetail = RouterOutputs["admin"]["menu"]["dishes"]["detail"];
export type PromotionDetail = RouterOutputs["admin"]["promotions"]["get"];
export type LanguageCatalogEntry = RouterOutputs["admin"]["languages"]["catalog"][number];
export type AdminLanguages = RouterOutputs["admin"]["languages"]["list"];
export type TranslationsCatalog = RouterOutputs["admin"]["translations"]["list"];
