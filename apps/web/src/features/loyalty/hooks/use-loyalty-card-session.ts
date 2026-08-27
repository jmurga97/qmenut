import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { getLoyaltyCardQueryOptions } from "~/features/loyalty/api/loyalty-query-options";
import { useLoyaltyCardToken } from "~/features/loyalty/hooks/use-loyalty-card-token";
import { getLoyaltyTarget, getTrpcErrorCode } from "~/features/loyalty/loyalty-utils";

import type { PendingRedemption } from "~/features/loyalty/types";
import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface LoyaltyCardSessionInput {
  host: string;
  trpc: TrpcOptionsProxy;
}

export function useLoyaltyCardSession({ host, trpc }: LoyaltyCardSessionInput) {
  const queryClient = useQueryClient();
  const tokenState = useLoyaltyCardToken(host);
  const { clearToken } = tokenState;
  const cardOptions = getLoyaltyCardQueryOptions({ host, trpc, cardToken: tokenState.token ?? "" });
  const cardQuery = useQuery({
    ...cardOptions,
    enabled: tokenState.hydrated && tokenState.token !== null,
    retry: false,
  });
  const unauthorized = getTrpcErrorCode(cardQuery.error) === "UNAUTHORIZED";

  useEffect(() => {
    if (unauthorized) clearToken();
  }, [clearToken, unauthorized]);

  const refreshCard = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: cardOptions.queryKey });
  }, [cardOptions.queryKey, queryClient]);

  const setPendingRedemption = useCallback(
    (pendingRedemption: PendingRedemption | null) => {
      queryClient.setQueryData(cardOptions.queryKey, (current) => {
        if (!current) return current;
        return { ...current, pendingRedemption };
      });
    },
    [cardOptions.queryKey, queryClient],
  );

  const card = unauthorized ? null : (cardQuery.data ?? null);
  const target = card ? getLoyaltyTarget(card.rewards, card.card.stampsBalance) : 0;

  return {
    card,
    error: cardQuery.error && !unauthorized,
    hydrated: tokenState.hydrated,
    loading: tokenState.token !== null && cardQuery.isLoading,
    target,
    token: tokenState.token,
    refreshCard,
    setPendingRedemption,
    setToken: tokenState.setToken,
  };
}
