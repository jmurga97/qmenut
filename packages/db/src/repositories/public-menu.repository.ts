import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";

import { getPromotionCandidateRows, getPromotionRows } from "./promotions.repository";
import { resolveTenantByHost } from "./tenant.repository";
import { getTranslationRows } from "./translations.repository";
import { createBestPromotionMap, isPromotionLikeActiveNow } from "../domain/promotions";
import { mapBranch } from "../mappers/branch.mapper";
import { mapPromotion } from "../mappers/promotion.mapper";
import { createTranslationsMap, mapPublicCategories, mapPublicDishes } from "../mappers/public-menu.mapper";
import { branchPhotos, branches, branchSchedules } from "../schema/branches";
import {
  allergens,
  categories,
  dishes,
  dishAllergens,
  dishAvailabilityWindows,
  dishExtras,
  dishTags,
  dishVariantGroups,
  dishVariantOptions,
  ingredients,
  tags,
} from "../schema/menu";

import type { DrizzleDb } from "../client";
import type { ResolvedTenant } from "../domain/tenant";
import type { PublicBranch, PublicBranchPhoto, PublicBranchSchedule } from "../models/branch";
import type { PublicPromotion } from "../models/promotion";
import type { PublicMenuData } from "../models/public-menu";

export type { ResolvedTenant } from "../domain/tenant";
export { normalizeTenantHost } from "../domain/tenant";
export type { PublicBranch, PublicBranchPhoto, PublicBranchSchedule } from "../models/branch";
export type {
  PublicAllergen,
  PublicCategory,
  PublicDish,
  PublicDishAvailabilityWindow,
  PublicDishExtra,
  PublicDishVariantGroup,
  PublicDishVariantOption,
  PublicMenuData,
  PublicTag,
} from "../models/public-menu";
export type { PublicDishPromotion, PublicPromotion } from "../models/promotion";
export type { PublicTranslation } from "../models/translation";
export { resolveTenantByHost };

export type CategoryRow = typeof categories.$inferSelect;
export type DishRow = typeof dishes.$inferSelect;
export type AvailabilityRow = typeof dishAvailabilityWindows.$inferSelect;
export type VariantGroupRow = typeof dishVariantGroups.$inferSelect;
export type VariantOptionRow = typeof dishVariantOptions.$inferSelect;

export interface TagRow {
  code: string | null;
  color: string | null;
  dishId: string;
  id: string;
  isSystem: boolean;
  label: string | null;
}

export interface AllergenRow {
  code: string;
  dishId: string;
  id: number;
}

export interface ExtraRow {
  dishId: string;
  id: string;
  name: string;
  position: number;
  price: number;
}

interface TenantInput {
  db: DrizzleDb;
  tenant: ResolvedTenant;
}

interface IdsInput {
  db: DrizzleDb;
  ids: string[];
}

interface TenantIdsInput extends TenantInput {
  ids: string[];
}

interface GetPublicMenuInput extends TenantInput {
  nowMs: number;
}

async function getBranchRow({ db, tenant }: TenantInput) {
  return db
    .select()
    .from(branches)
    .where(
      and(
        eq(branches.id, tenant.branchId),
        eq(branches.restaurantId, tenant.restaurantId),
        isNull(branches.deletedAt),
        eq(branches.isActive, true),
      ),
    )
    .get();
}

async function getBranchPhotos({ db, tenant }: TenantInput): Promise<PublicBranchPhoto[]> {
  return db
    .select({
      id: branchPhotos.id,
      url: branchPhotos.url,
      position: branchPhotos.position,
    })
    .from(branchPhotos)
    .where(eq(branchPhotos.branchId, tenant.branchId))
    .orderBy(asc(branchPhotos.position), asc(branchPhotos.id))
    .all();
}

async function getBranchSchedules({ db, tenant }: TenantInput): Promise<PublicBranchSchedule[]> {
  return db
    .select({
      id: branchSchedules.id,
      dayOfWeek: branchSchedules.dayOfWeek,
      openMinute: branchSchedules.openMinute,
      closeMinute: branchSchedules.closeMinute,
    })
    .from(branchSchedules)
    .where(eq(branchSchedules.branchId, tenant.branchId))
    .orderBy(asc(branchSchedules.dayOfWeek), asc(branchSchedules.openMinute))
    .all();
}

export async function getPublicBranch({ db, tenant }: TenantInput): Promise<PublicBranch | null> {
  const row = await getBranchRow({ db, tenant });

  if (!row) {
    return null;
  }

  const [photos, schedules] = await Promise.all([getBranchPhotos({ db, tenant }), getBranchSchedules({ db, tenant })]);

  return mapBranch({ row, photos, schedules });
}

async function getCategoryRows({ db, tenant }: TenantInput): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.branchId, tenant.branchId),
        eq(categories.restaurantId, tenant.restaurantId),
        isNull(categories.deletedAt),
        eq(categories.isActive, true),
      ),
    )
    .orderBy(asc(categories.position), asc(categories.id))
    .all();
}

async function getDishRows({ db, tenant }: TenantInput): Promise<DishRow[]> {
  return db
    .select()
    .from(dishes)
    .where(
      and(
        eq(dishes.branchId, tenant.branchId),
        eq(dishes.restaurantId, tenant.restaurantId),
        isNull(dishes.deletedAt),
        eq(dishes.isActive, true),
      ),
    )
    .orderBy(asc(dishes.position), asc(dishes.id))
    .all();
}

async function getAvailabilityRows({ db, ids }: IdsInput): Promise<AvailabilityRow[]> {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select()
    .from(dishAvailabilityWindows)
    .where(inArray(dishAvailabilityWindows.dishId, ids))
    .orderBy(asc(dishAvailabilityWindows.dayOfWeek), asc(dishAvailabilityWindows.startMinute))
    .all();
}

async function getVariantGroupRows({ db, ids }: IdsInput): Promise<VariantGroupRow[]> {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select()
    .from(dishVariantGroups)
    .where(inArray(dishVariantGroups.dishId, ids))
    .orderBy(asc(dishVariantGroups.position), asc(dishVariantGroups.id))
    .all();
}

async function getVariantOptionRows({ db, ids }: IdsInput): Promise<VariantOptionRow[]> {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select()
    .from(dishVariantOptions)
    .where(and(inArray(dishVariantOptions.groupId, ids), eq(dishVariantOptions.isActive, true)))
    .orderBy(asc(dishVariantOptions.position), asc(dishVariantOptions.id))
    .all();
}

async function getTagRows({ db, ids, tenant }: TenantIdsInput): Promise<TagRow[]> {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select({
      dishId: dishTags.dishId,
      id: tags.id,
      code: tags.code,
      label: tags.label,
      color: tags.color,
      isSystem: tags.isSystem,
    })
    .from(dishTags)
    .innerJoin(tags, eq(dishTags.tagId, tags.id))
    .where(
      and(inArray(dishTags.dishId, ids), or(isNull(tags.restaurantId), eq(tags.restaurantId, tenant.restaurantId))),
    )
    .orderBy(asc(tags.isSystem), asc(tags.label), asc(tags.code))
    .all();
}

async function getAllergenRows({ db, ids }: IdsInput): Promise<AllergenRow[]> {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select({
      dishId: dishAllergens.dishId,
      id: allergens.id,
      code: allergens.code,
    })
    .from(dishAllergens)
    .innerJoin(allergens, eq(dishAllergens.allergenId, allergens.id))
    .where(inArray(dishAllergens.dishId, ids))
    .orderBy(asc(allergens.code))
    .all();
}

async function getExtraRows({ db, ids, tenant }: TenantIdsInput): Promise<ExtraRow[]> {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select({
      dishId: dishExtras.dishId,
      id: ingredients.id,
      name: ingredients.name,
      price: ingredients.price,
      position: dishExtras.position,
    })
    .from(dishExtras)
    .innerJoin(ingredients, eq(dishExtras.ingredientId, ingredients.id))
    .where(
      and(
        inArray(dishExtras.dishId, ids),
        eq(ingredients.restaurantId, tenant.restaurantId),
        eq(ingredients.isActive, true),
        isNull(ingredients.deletedAt),
      ),
    )
    .orderBy(asc(dishExtras.position), asc(ingredients.name), asc(ingredients.id))
    .all();
}

export async function getPublicMenu({ db, nowMs, tenant }: GetPublicMenuInput): Promise<PublicMenuData | null> {
  const branch = await getPublicBranch({ db, tenant });

  if (!branch) {
    return null;
  }

  const [categoryRows, dishRows, promotionRows] = await Promise.all([
    getCategoryRows({ db, tenant }),
    getDishRows({ db, tenant }),
    getPromotionRows({ db, tenant }),
  ]);
  const categoryIds = categoryRows.map((row) => row.id);
  const dishIds = dishRows.map((row) => row.id);
  const [availabilityRows, variantGroupRows, tagRows, allergenRows, extraRows, promotionCandidateRows] =
    await Promise.all([
      getAvailabilityRows({ db, ids: dishIds }),
      getVariantGroupRows({ db, ids: dishIds }),
      getTagRows({ db, tenant, ids: dishIds }),
      getAllergenRows({ db, ids: dishIds }),
      getExtraRows({ db, tenant, ids: dishIds }),
      getPromotionCandidateRows({ db, tenant, ids: dishIds }),
    ]);
  const variantOptionRows = await getVariantOptionRows({
    db,
    ids: variantGroupRows.map((row) => row.id),
  });
  const translationRows = await getTranslationRows({
    db,
    tenant,
    ids: [
      ...categoryIds,
      ...dishIds,
      ...extraRows.map((row) => row.id),
      ...variantGroupRows.map((row) => row.id),
      ...variantOptionRows.map((row) => row.id),
    ],
  });
  const translationsByEntity = createTranslationsMap(translationRows);
  const activePromotions = promotionRows.filter((row) => isPromotionLikeActiveNow({ promotion: row, nowMs }));
  const promotionsById = new Map(activePromotions.map((row) => [row.id, row]));
  const bestPromotionsByDish = createBestPromotionMap({ candidates: promotionCandidateRows, nowMs });
  const dishesByCategory = mapPublicDishes({
    allergenRows,
    availabilityRows,
    bestPromotionsByDish,
    dishRows,
    extraRows,
    promotionsById,
    tagRows,
    translationsByEntity,
    variantGroupRows,
    variantOptionRows,
  });

  return {
    branch,
    categories: mapPublicCategories({ categoryRows, dishesByCategory, translationsByEntity }),
    promotions: activePromotions.map((row): PublicPromotion => mapPromotion(row)),
  };
}
