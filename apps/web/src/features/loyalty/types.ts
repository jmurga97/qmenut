import type { AppRouter } from "@qmenut/api/router";
import type { QmRedeemWaitStatus } from "@qmenut/ui/components/qm-redeem-wait";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type LoyaltyProgram = NonNullable<RouterOutputs["loyalty"]["program"]>;
export type LoyaltyCard = RouterOutputs["loyalty"]["getCard"];
export type LoyaltyReward = LoyaltyCard["rewards"][number];
export type PendingRedemption = NonNullable<LoyaltyCard["pendingRedemption"]>;

export interface RedemptionView extends PendingRedemption {
  status: QmRedeemWaitStatus;
}

export interface RedeemedNotice {
  redemptionId: string;
  rewardName: string;
}
