interface TrpcErrorLike {
  data?: { code?: string };
}

export function getTrpcErrorCode(error: unknown): string | undefined {
  return (error as TrpcErrorLike | undefined)?.data?.code;
}

export function getLoyaltyTarget(rewards: { cost: number }[], balance: number): number {
  if (rewards.length === 0) return 0;

  return rewards.find((reward) => reward.cost > balance)?.cost ?? rewards.at(-1)?.cost ?? 0;
}
