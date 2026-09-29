import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

interface BranchInput {
  branchId: string;
  trpc: TrpcOptionsProxy;
}
interface MutationInput extends BranchInput {
  queryClient: QueryClient;
}
export function getPromotionsQueryOptions({ branchId, trpc }: BranchInput) {
  return trpc.admin.promotions.list.queryOptions({ branchId });
}
export function getPromotionQueryOptions({ promotionId, trpc }: { promotionId: string; trpc: TrpcOptionsProxy }) {
  return trpc.admin.promotions.get.queryOptions({ promotionId });
}
// Covers the list and every cached detail: the list | editor layout reopens promotions in place.
function invalidatePromotions({ queryClient, trpc }: MutationInput) {
  return queryClient.invalidateQueries({ queryKey: trpc.admin.promotions.pathKey() });
}
export function getPromotionMutationOptions(input: MutationInput) {
  const options = { onSuccess: () => invalidatePromotions(input) };
  return {
    create: input.trpc.admin.promotions.create.mutationOptions(options),
    setStatus: input.trpc.admin.promotions.setStatus.mutationOptions(options),
    update: input.trpc.admin.promotions.update.mutationOptions(options),
  };
}
