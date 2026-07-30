import type { QueryClient } from "@tanstack/react-query";
import type { LoyaltyInsightsSearch } from "~/features/loyalty/types";
import type { TrpcOptionsProxy } from "~/lib/trpc";

type ApiContext = { trpc: TrpcOptionsProxy };
type MutationContext = ApiContext & { queryClient: QueryClient };
export function getLoyaltyProgramQueryOptions({ trpc }: ApiContext) {
  return trpc.admin.loyalty.getProgram.queryOptions();
}
export function getVenueCodeQueryOptions({ branchId, trpc }: ApiContext & { branchId: string }) {
  return trpc.admin.loyalty.venueCode.queryOptions({ branchId });
}
export function getPendingRedemptionsQueryOptions({ trpc }: ApiContext) {
  return trpc.admin.loyalty.pendingRedemptions.queryOptions();
}
export function getLoyaltySummaryQueryOptions({ trpc }: ApiContext) {
  return trpc.admin.loyalty.insights.summary.queryOptions();
}
export function getLoyaltyCustomersQueryOptions({
  search,
  trpc,
  page = search.page,
  pageSize = 25,
}: ApiContext & { search: LoyaltyInsightsSearch; page?: number; pageSize?: number }) {
  return trpc.admin.loyalty.insights.customers.queryOptions({
    search: search.search || undefined,
    sortBy: search.sortBy,
    sortDir: search.sortDir,
    page,
    pageSize,
    inactiveDays: search.inactive ? 30 : undefined,
  });
}
export function getLoyaltyVisitsQueryOptions({ from, to, trpc }: ApiContext & { from: number; to: number }) {
  return trpc.admin.loyalty.insights.visitsChart.queryOptions({ from, to });
}
export function getLoyaltyReturnQueryOptions({ trpc }: ApiContext) {
  return trpc.admin.loyalty.insights.loyaltyReturn.queryOptions();
}
export function getLoyaltyMutationOptions({ queryClient, trpc }: MutationContext) {
  const options = { onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.admin.loyalty.pathKey() }) };
  return {
    createReward: trpc.admin.loyalty.createReward.mutationOptions(options),
    deleteReward: trpc.admin.loyalty.deleteReward.mutationOptions(options),
    reject: trpc.admin.loyalty.rejectRedemption.mutationOptions(options),
    saveProgram: trpc.admin.loyalty.saveProgram.mutationOptions(options),
    undo: trpc.admin.loyalty.undo.mutationOptions(options),
    updateReward: trpc.admin.loyalty.updateReward.mutationOptions(options),
    validate: trpc.admin.loyalty.validateRedemption.mutationOptions(options),
  };
}
