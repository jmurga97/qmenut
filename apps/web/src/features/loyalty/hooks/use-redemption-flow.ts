import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import {
  getLoyaltyMutationOptions,
  getRedemptionStatusQueryOptions,
} from "~/features/loyalty/api/loyalty-query-options";
import { useLoyaltyClock } from "~/features/loyalty/hooks/use-loyalty-clock";

import type { LoyaltyCard, LoyaltyReward, PendingRedemption, RedeemedNotice } from "~/features/loyalty/types";
import type { TrpcOptionsProxy } from "~/lib/trpc-client";

const REDEMPTION_POLL_INTERVAL_MS = 2000;

interface RedemptionFlowInput {
  card: LoyaltyCard | null;
  host: string;
  refreshCard: () => Promise<void>;
  setPendingRedemption: (redemption: PendingRedemption | null) => void;
  token: string | null | undefined;
  trpc: TrpcOptionsProxy;
}

export function useRedemptionFlow({ card, host, refreshCard, setPendingRedemption, token, trpc }: RedemptionFlowInput) {
  const pending = card?.pendingRedemption ?? null;
  const [redeemedNotice, setRedeemedNotice] = useState<RedeemedNotice | null>(null);
  const handledRedemption = useRef<string | null>(null);
  const options = getLoyaltyMutationOptions(trpc);
  const requestMutation = useMutation(options.requestRedemption);
  const cancelMutation = useMutation(options.cancelRedemption);
  const statusOptions = getRedemptionStatusQueryOptions({
    host,
    trpc,
    cardToken: token ?? "",
    redemptionId: pending?.id ?? "",
  });
  const statusQuery = useQuery({
    ...statusOptions,
    enabled: Boolean(token && pending),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const terminal = Boolean(status && status !== "pending");
      const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
      return terminal || hidden ? false : REDEMPTION_POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: true,
    retry: false,
  });
  const now = useLoyaltyClock(Boolean(pending));
  const serverStatus = statusQuery.data?.status;
  const validatedReward = serverStatus === "validated" && pending ? pending.rewardName : null;

  useEffect(() => {
    if (!pending || serverStatus !== "validated" || handledRedemption.current === pending.id) return;

    handledRedemption.current = pending.id;
    setRedeemedNotice({ redemptionId: pending.id, rewardName: pending.rewardName });
    void refreshCard();
  }, [pending, refreshCard, serverStatus]);

  let status: "expired" | "pending" | "rejected" = "pending";
  if (serverStatus === "rejected") status = "rejected";
  else if (serverStatus === "expired" || (pending && pending.expiresAt <= now)) status = "expired";

  const current = pending && serverStatus !== "validated" ? { ...pending, status } : null;

  async function redeem(reward: LoyaltyReward): Promise<void> {
    if (!token || requestMutation.isPending) return;

    try {
      const result = await requestMutation.mutateAsync({ host, cardToken: token, rewardId: reward.id });
      setPendingRedemption({
        cost: reward.cost,
        expiresAt: result.expiresAt,
        id: result.redemptionId,
        rewardId: reward.id,
        rewardName: reward.name,
      });
    } catch {
      await refreshCard();
    }
  }

  async function cancel(): Promise<void> {
    if (!token || !pending || cancelMutation.isPending) return;

    try {
      await cancelMutation.mutateAsync({
        host,
        cardToken: token,
        redemptionId: pending.id,
      });
      setPendingRedemption(null);
      await refreshCard();
    } catch {
      await statusQuery.refetch();
    }
  }

  async function returnToCard(): Promise<void> {
    await statusQuery.refetch();
    await refreshCard();
    setPendingRedemption(null);
  }

  return {
    busy: requestMutation.isPending || cancelMutation.isPending,
    current,
    redeemedReward: validatedReward ?? redeemedNotice?.rewardName ?? null,
    remainingMs: pending ? Math.max(0, pending.expiresAt - now) : 0,
    cancel,
    redeem,
    returnToCard,
  };
}
