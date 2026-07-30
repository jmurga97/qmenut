import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

type ThemeOptionsInput = { branchId: string; trpc: TrpcOptionsProxy };
export function getThemeQueryOptions({ branchId, trpc }: ThemeOptionsInput) {
  return trpc.admin.theme.get.queryOptions({ branchId });
}
export function getSaveThemeMutationOptions(input: ThemeOptionsInput & { queryClient: QueryClient }) {
  const { branchId, queryClient, trpc } = input;
  return trpc.admin.theme.save.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getThemeQueryOptions({ branchId, trpc }).queryKey }),
  });
}
