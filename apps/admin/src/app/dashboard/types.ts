import { z } from "zod";

import { VISIT_PERIODS } from "~/shared/services/visit-series";

export const dashboardSearchSchema = z.object({
  period: z.enum(VISIT_PERIODS).default("30d"),
});
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
