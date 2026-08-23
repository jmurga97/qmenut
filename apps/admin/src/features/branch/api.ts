import { getTenantQueryOptions } from "~/shared/api";

import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

type BranchOptionsInput = { branchId: string; trpc: TrpcOptionsProxy };
export function getBranchQueryOptions({ branchId, trpc }: BranchOptionsInput) {
  return trpc.admin.branches.get.queryOptions({ branchId });
}
export function getAddressSuggestionsQueryOptions({ branchId, query, trpc }: BranchOptionsInput & { query: string }) {
  return trpc.admin.branches.searchAddresses.queryOptions({ branchId, query });
}
export function getGooglePlaceCandidatesQueryOptions({
  branchId,
  query,
  trpc,
}: BranchOptionsInput & { query: string }) {
  return trpc.admin.branches.searchGooglePlaces.queryOptions({ branchId, query });
}
export function getGoogleReviewsConnectionMutationOptions(input: BranchOptionsInput & { queryClient: QueryClient }) {
  const { branchId, queryClient, trpc } = input;
  return trpc.admin.branches.setGoogleReviewsConnection.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getBranchQueryOptions({ branchId, trpc }).queryKey }),
  });
}
export function getSaveBranchMutationOptions(input: BranchOptionsInput & { queryClient: QueryClient }) {
  const { branchId, queryClient, trpc } = input;
  return trpc.admin.branches.save.mutationOptions({
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: getBranchQueryOptions({ branchId, trpc }).queryKey }),
        queryClient.invalidateQueries({ queryKey: getTenantQueryOptions({ trpc }).queryKey }),
      ]),
  });
}
