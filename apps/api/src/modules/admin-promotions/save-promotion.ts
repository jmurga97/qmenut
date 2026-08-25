import { createPromotion, updatePromotion } from "@qmenut/db/repositories/admin-promotions.repository";
import { TRPCError } from "@trpc/server";

import { getMenuCatalog } from "../admin-menu/get-menu-catalog";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db/client";
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
  const normalizedTargets = normalizeTargets(data.scope, targets);
  await assertPromotionTargets({ db, restaurantId, branchId, targets: normalizedTargets });
  const id = await createPromotion({
    db,
    restaurantId,
    branchId,
    data,
    targets: normalizedTargets,
  });
  return { id };
}

interface UpdatePromotionInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  promotionId: string;
  data: PromotionWriteData;
  targets: PromotionTargetRow[];
}

export async function updateBranchPromotion({
  db,
  restaurantId,
  branchId,
  promotionId,
  data,
  targets,
}: UpdatePromotionInput): Promise<{ id: string }> {
  const normalizedTargets = normalizeTargets(data.scope, targets);
  await assertPromotionTargets({ db, restaurantId, branchId, targets: normalizedTargets });
  await updatePromotion({ db, restaurantId, promotionId, data, targets: normalizedTargets });
  return { id: promotionId };
}

/** Los alcances 'info' y 'branch' no llevan targets; los demás exigen al menos uno. */
function normalizeTargets(scope: PromotionWriteData["scope"], targets: PromotionTargetRow[]): PromotionTargetRow[] {
  if (scope === "info" || scope === "branch") {
    return [];
  }

  const expectedType = scope === "dish" ? "dish" : "category";
  const normalizedTargets = targets.filter((target) => target.targetType === expectedType);

  if (normalizedTargets.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona al menos un plato o categoría" });
  }

  return normalizedTargets;
}

interface AssertPromotionTargetsInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  targets: PromotionTargetRow[];
}

async function assertPromotionTargets({
  db,
  restaurantId,
  branchId,
  targets,
}: AssertPromotionTargetsInput): Promise<void> {
  if (targets.length === 0) return;

  const catalog = await getMenuCatalog({ db, restaurantId, branchId });
  const dishIds = new Set(catalog.dishes.map((dish) => dish.id));
  const categoryIds = new Set(catalog.categories.map((category) => category.id));
  const hasInvalidTarget = targets.some((target) =>
    target.targetType === "dish" ? !dishIds.has(target.targetId) : !categoryIds.has(target.targetId),
  );

  if (hasInvalidTarget) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "La promoción contiene destinos no válidos" });
  }
}
