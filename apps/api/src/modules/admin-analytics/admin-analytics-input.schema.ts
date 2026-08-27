import { z } from "zod";

export const analyticsPeriodSchema = z.enum(["15d", "30d", "90d"]).default("15d");

export const analyticsSnapshotInputSchema = z.object({
  period: analyticsPeriodSchema,
});
