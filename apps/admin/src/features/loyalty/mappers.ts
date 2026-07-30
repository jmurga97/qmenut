import { centsToEuros, eurosToCents } from "~/shared/services/money";

import type * as Loyalty from "~/features/loyalty/types";

export function toRewardFormValues(
  reward: Loyalty.LoyaltyProgramResponse["rewards"][number],
): Loyalty.RewardFormValues {
  return {
    rewardId: reward.id,
    name: reward.name,
    description: reward.description ?? "",
    cost: String(reward.cost),
    type: reward.type,
    percentage: reward.percentage === null ? "" : String(reward.percentage),
    specialPriceEuros: centsToEuros(reward.specialPrice),
    freeDishId: reward.freeDishId ?? "",
    isActive: reward.isActive,
  };
}
export function createEmptyRewardFormValues(): Loyalty.RewardFormValues {
  return {
    rewardId: null,
    name: "",
    description: "",
    cost: "8",
    type: "free_dish",
    percentage: "10",
    specialPriceEuros: "",
    freeDishId: "",
    isActive: true,
  };
}
export function toLoyaltyProgramFormValues(data: Loyalty.LoyaltyProgramResponse): Loyalty.LoyaltyProgramFormValues {
  return {
    isActive: data.program?.isActive ?? false,
    ticketMedioEuros: centsToEuros(data.program?.ticketMedio),
    rewards: data.rewards.map((reward) => toRewardFormValues(reward)),
  };
}
export function toLoyaltyProgramInput(values: Loyalty.LoyaltyProgramFormValues) {
  return {
    isActive: values.isActive,
    ticketMedio: values.ticketMedioEuros === "" ? null : eurosToCents(values.ticketMedioEuros),
  };
}
export function toRewardInput(values: Loyalty.RewardFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    cost: Number(values.cost),
    type: values.type,
    percentage: values.type === "percentage_discount" ? Number(values.percentage) : null,
    specialPrice: values.type === "special_price" ? eurosToCents(values.specialPriceEuros) : null,
    freeDishId: values.type === "percentage_discount" ? null : values.freeDishId,
    isActive: values.isActive,
  };
}
export function toDishOptions(input: {
  branches: Array<{ name: string }>;
  dishLists: Array<Array<{ id: string; name: string }>>;
}) {
  return input.dishLists.flatMap((dishes, index) => {
    const branchName = input.branches[index]?.name ?? "Sucursal";
    return dishes.map((dish) => ({ id: dish.id, label: `${dish.name} · ${branchName}` }));
  });
}
