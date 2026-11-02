import type { TrpcOptionsProxy } from "~/lib/trpc-client";

const STAMP_POLL_INTERVAL_MS = 15_000;

interface LoyaltyProgramQueryOptionsInput {
  host: string;
  trpc: TrpcOptionsProxy;
  locale?: string;
}

interface LoyaltyCardQueryOptionsInput extends LoyaltyProgramQueryOptionsInput {
  cardToken: string;
}

interface RedemptionStatusQueryOptionsInput extends LoyaltyCardQueryOptionsInput {
  redemptionId: string;
}

export function getLoyaltyProgramQueryOptions({ host, trpc, locale }: LoyaltyProgramQueryOptionsInput) {
  return trpc.loyalty.program.queryOptions({ host, locale });
}

export function getLoyaltyCardQueryOptions({ cardToken, host, trpc }: LoyaltyCardQueryOptionsInput) {
  // Poll only while stamps await staff and the tab is visible; otherwise refresh when the guest comes back.
  return trpc.loyalty.getCard.queryOptions(
    { host, cardToken },
    {
      refetchInterval: (query) => {
        const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
        return !hidden && (query.state.data?.pendingStamps ?? 0) > 0 ? STAMP_POLL_INTERVAL_MS : false;
      },
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
    },
  );
}

export function getRedemptionStatusQueryOptions({
  cardToken,
  host,
  redemptionId,
  trpc,
}: RedemptionStatusQueryOptionsInput) {
  return trpc.loyalty.redemptionStatus.queryOptions({ host, cardToken, redemptionId });
}

// Fail offline writes immediately so reconnecting cannot silently submit an old request.
export function getLoyaltyMutationOptions(trpc: TrpcOptionsProxy) {
  return {
    acceptConsent: trpc.loyalty.acceptConsent.mutationOptions({ networkMode: "always" }),
    cancelRedemption: trpc.loyalty.cancelRedemption.mutationOptions({ networkMode: "always" }),
    createCard: trpc.loyalty.createCard.mutationOptions({ networkMode: "always" }),
    cancelStampRequest: trpc.loyalty.cancelStampRequest.mutationOptions({ networkMode: "always" }),
    dismissStampOutcome: trpc.loyalty.dismissStampOutcome.mutationOptions({ networkMode: "always" }),
    requestStamps: trpc.loyalty.requestStamps.mutationOptions({ networkMode: "always" }),
    requestRedemption: trpc.loyalty.requestRedemption.mutationOptions({ networkMode: "always" }),
  };
}
