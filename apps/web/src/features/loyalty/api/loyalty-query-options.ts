import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface LoyaltyProgramQueryOptionsInput {
  host: string;
  trpc: TrpcOptionsProxy;
}

interface LoyaltyCardQueryOptionsInput extends LoyaltyProgramQueryOptionsInput {
  cardToken: string;
}

interface RedemptionStatusQueryOptionsInput extends LoyaltyCardQueryOptionsInput {
  redemptionId: string;
}

export function getLoyaltyProgramQueryOptions({ host, trpc }: LoyaltyProgramQueryOptionsInput) {
  return trpc.loyalty.program.queryOptions({ host });
}

export function getLoyaltyCardQueryOptions({ cardToken, host, trpc }: LoyaltyCardQueryOptionsInput) {
  return trpc.loyalty.getCard.queryOptions({ host, cardToken });
}

export function getRedemptionStatusQueryOptions({
  cardToken,
  host,
  redemptionId,
  trpc,
}: RedemptionStatusQueryOptionsInput) {
  return trpc.loyalty.redemptionStatus.queryOptions({ host, cardToken, redemptionId });
}

export function getLoyaltyMutationOptions(trpc: TrpcOptionsProxy) {
  return {
    cancelRedemption: trpc.loyalty.cancelRedemption.mutationOptions(),
    createCard: trpc.loyalty.createCard.mutationOptions(),
    earnStamp: trpc.loyalty.earnStamp.mutationOptions(),
    requestRedemption: trpc.loyalty.requestRedemption.mutationOptions(),
  };
}
