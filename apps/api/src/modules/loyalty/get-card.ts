import { getCardState } from "@qmenut/db/repositories/customers.repository";
import { getLoyaltyProgram, listRewards } from "@qmenut/db/repositories/loyalty-admin.repository";
import { expireStaleRedemptions, findPendingRedemption } from "@qmenut/db/repositories/loyalty-ledger.repository";
import { TRPCError } from "@trpc/server";

import { maskEmail } from "./mask-email";
import { resolveCard } from "./resolve-card";
import { REDEMPTION_TTL_MS } from "../../lib/loyalty/token";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { CustomerCardState, LoyaltyRewardView } from "@qmenut/db/models/loyalty";

interface GetCardInput {
  db: DrizzleDb;
  env: RuntimeEnv;
  request: Request;
  host?: string;
  cardToken: string;
}

export interface CardRewardView extends LoyaltyRewardView {
  unlocked: boolean;
}

export interface PendingRedemptionForClient {
  cost: number;
  expiresAt: number;
  id: string;
  rewardId: string;
  rewardName: string;
}

export interface GetCardResult {
  card: CustomerCardState;
  /** True when the card is view-only until the customer re-accepts the current privacy policy. */
  consentRequired: boolean;
  pendingRedemption: PendingRedemptionForClient | null;
  programActive: boolean;
  rewards: CardRewardView[];
}

export async function getCard({ db, env, request, host, cardToken }: GetCardInput): Promise<GetCardResult> {
  const { tenant, customerId, consentSatisfied } = await resolveCard({
    db,
    env,
    request,
    host,
    cardToken,
    requireConsent: false,
  });

  await expireStaleRedemptions({ db, restaurantId: tenant.restaurantId, olderThanMs: REDEMPTION_TTL_MS });

  const [card, program, rewards, pending] = await Promise.all([
    getCardState({ db, customerId, restaurantId: tenant.restaurantId }),
    getLoyaltyProgram({ db, restaurantId: tenant.restaurantId }),
    listRewards({ db, restaurantId: tenant.restaurantId, includeInactive: false }),
    findPendingRedemption({ db, restaurantId: tenant.restaurantId, customerId }),
  ]);

  if (!card) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Tarjeta no encontrada" });
  }

  const rewardViews: CardRewardView[] = rewards.map((reward) => ({
    ...reward,
    unlocked: card.stampsBalance >= reward.cost,
  }));

  let pendingRedemption: PendingRedemptionForClient | null = null;

  if (pending) {
    pendingRedemption = {
      id: pending.id,
      rewardId: pending.rewardId,
      rewardName: pending.rewardName,
      cost: pending.cost,
      expiresAt: pending.createdAt + REDEMPTION_TTL_MS,
    };
  }

  return {
    card: consentSatisfied ? card : { ...card, email: maskEmail(card.email) },
    consentRequired: !consentSatisfied,
    rewards: rewardViews,
    programActive: program?.isActive ?? false,
    pendingRedemption,
  };
}
