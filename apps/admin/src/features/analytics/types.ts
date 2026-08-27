import { z } from "zod";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

const analyticsPeriodSchema = z.enum(["15d", "30d", "90d"]);

export const analyticsSearchSchema = z.object({
  period: analyticsPeriodSchema.catch("15d"),
});

export const ANALYTICS_PERIOD_OPTIONS = [
  { label: "15 días", value: "15d" },
  { label: "30 días", value: "30d" },
  { label: "90 días", value: "90d" },
] as const;

export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;
export type AnalyticsSearch = z.infer<typeof analyticsSearchSchema>;
export type AnalyticsSnapshot = RouterOutputs["admin"]["analytics"]["snapshot"];
