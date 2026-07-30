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
function invalidatePromotions({ branchId, queryClient, trpc }: MutationInput) {
  return queryClient.invalidateQueries({ queryKey: getPromotionsQueryOptions({ branchId, trpc }).queryKey });
}
export function getPromotionMutationOptions(input: MutationInput) {
  const options = { onSuccess: () => invalidatePromotions(input) };
  return {
    create: input.trpc.admin.promotions.create.mutationOptions(options),
    update: input.trpc.admin.promotions.update.mutationOptions(options),
  };
}
