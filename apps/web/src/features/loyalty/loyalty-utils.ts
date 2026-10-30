export function getLoyaltyTarget(rewards: { cost: number }[], balance: number): number {
  if (rewards.length === 0) return 0;

  return rewards.find((reward) => reward.cost > balance)?.cost ?? rewards.at(-1)?.cost ?? 0;
}
