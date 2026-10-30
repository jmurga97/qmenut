import type { TrpcOptionsProxy } from "~/lib/trpc-client";

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
  // Staff can answer hours later: refresh whenever the guest comes back, no polling.
  return trpc.loyalty.getCard.queryOptions(
    { host, cardToken },
    { refetchOnMount: "always", refetchOnWindowFocus: "always" },
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
