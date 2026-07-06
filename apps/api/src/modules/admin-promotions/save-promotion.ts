import { TRPCError } from "@trpc/server";
import { createPromotion, getPromotion, updatePromotion } from "@qmenut/db/repositories/admin-promotions.repository";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db";
import type { PromotionTargetRow, PromotionWriteData } from "@qmenut/db/repositories/admin-promotions.repository";

interface CreatePromotionInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  data: PromotionWriteData;
  targets: PromotionTargetRow[];
}

export async function createBranchPromotion({
  db,
  restaurantId,
  branchId,
  data,
  targets,
}: CreatePromotionInput): Promise<{ id: string }> {
  await assertBranchAccess({ db, restaurantId, branchId });
  const id = await createPromotion({
    db,
    restaurantId,
    branchId,
    data,
    targets: normalizeTargets(data.scope, targets),
  });
  return { id };
}

interface UpdatePromotionInput {
  db: DrizzleDb;
  restaurantId: string;
  promotionId: string;
  data: PromotionWriteData;
  targets: PromotionTargetRow[];
}

export async function updateBranchPromotion({
  db,
  restaurantId,
  promotionId,
  data,
  targets,
}: UpdatePromotionInput): Promise<{ id: string }> {
  const existing = await getPromotion({ db, restaurantId, promotionId });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Promotion not found" });
  }

  await updatePromotion({ db, restaurantId, promotionId, data, targets: normalizeTargets(data.scope, targets) });
  return { id: promotionId };
}

/** Los alcances 'info' y 'branch' no llevan targets; los demás exigen al menos uno. */
function normalizeTargets(scope: PromotionWriteData["scope"], targets: PromotionTargetRow[]): PromotionTargetRow[] {
  if (scope === "info" || scope === "branch") {
    return [];
  }

  if (targets.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona al menos un plato o categoría" });
  }

  const expectedType = scope === "dish" ? "dish" : "category";
  return targets.filter((target) => target.targetType === expectedType);
}
