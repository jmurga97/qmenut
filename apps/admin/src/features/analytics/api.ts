import type { AnalyticsPeriod } from "./types";
import type { TrpcOptionsProxy } from "~/lib/trpc";

export function getAnalyticsSnapshotQueryOptions({
  period,
  trpc,
}: {
  period: AnalyticsPeriod;
  trpc: TrpcOptionsProxy;
}) {
  return trpc.admin.analytics.snapshot.queryOptions({ period });
}
