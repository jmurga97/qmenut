import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

interface ExchangeRateApiContext {
  queryClient: QueryClient;
  trpc: TrpcOptionsProxy;
}

export function getExchangeRatesSummaryQueryOptions({ trpc }: Pick<ExchangeRateApiContext, "trpc">) {
  return trpc.admin.exchangeRates.summary.queryOptions();
}

export function getSaveExchangeRateMutationOptions({ queryClient, trpc }: ExchangeRateApiContext) {
  return trpc.admin.exchangeRates.save.mutationOptions({
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getExchangeRatesSummaryQueryOptions({ trpc }).queryKey }),
  });
}
