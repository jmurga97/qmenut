import { z } from "zod";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export const dashboardSearchSchema = z.object({
  period: z.enum(["12m", "30d"]).default("30d"),
});
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
export type DashboardTenant = RouterOutputs["admin"]["tenant"]["me"];
export type DashboardCategory = RouterOutputs["admin"]["menu"]["categories"]["list"][number];
export type DashboardDish = RouterOutputs["admin"]["menu"]["dishes"]["list"][number];
export type DashboardBillingOverview = RouterOutputs["admin"]["billing"]["overview"];
export type DashboardLanguages = RouterOutputs["admin"]["languages"]["list"];
export type DashboardTranslationsCatalog = RouterOutputs["admin"]["translations"]["list"];

export type AttentionSeverity = "error" | "info" | "warning";

export interface AttentionItem {
  detail?: string;
  id: string;
  label: string;
  linkParams?: Record<string, string>;
  linkTo?: string;
  severity: AttentionSeverity;
}

export interface TranslationCoverage {
  languageCode: string;
  label: string;
  missing: number;
  pending: number;
  total: number;
  translated: number;
}
