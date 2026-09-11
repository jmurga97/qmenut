import { getThemeQueryOptions } from "~/shared/api";

import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

type ThemeOptionsInput = { branchId: string; trpc: TrpcOptionsProxy };
export function getSaveThemeMutationOptions(input: ThemeOptionsInput & { queryClient: QueryClient }) {
  const { branchId, queryClient, trpc } = input;
  return trpc.admin.theme.save.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getThemeQueryOptions({ branchId, trpc }).queryKey }),
  });
}
