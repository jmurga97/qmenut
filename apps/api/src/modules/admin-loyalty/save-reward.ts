import {
  createReward as createRewardRow,
  dishBelongsToRestaurant,
  updateReward as updateRewardRow,
} from "@qmenut/db/repositories/loyalty-admin.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";
import type { RewardWriteData } from "@qmenut/db/repositories/loyalty-admin.repository";

interface SaveRewardInput {
  db: DrizzleDb;
  restaurantId: string;
  rewardId?: string;
  data: RewardWriteData;
}

export async function saveReward({ db, restaurantId, rewardId, data }: SaveRewardInput): Promise<{ id: string }> {
  if (data.freeDishId) {
    const owned = await dishBelongsToRestaurant({ db, restaurantId, dishId: data.freeDishId });

    if (!owned) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "El plato no pertenece a este restaurante" });
    }
  }

  if (rewardId) {
    await updateRewardRow({ db, restaurantId, rewardId, data });

    return { id: rewardId };
  }

  const id = await createRewardRow({ db, restaurantId, data });

  return { id };
}
