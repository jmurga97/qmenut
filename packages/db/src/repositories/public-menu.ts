import { getPublicBranch, normalizeTenantHost, resolveTenantByHost } from "../entities/branches/public-menu";
import {
  getAllergenRows,
  getAvailabilityRows,
  getCategoryRows,
  getDishRows,
  getTagRows,
  getVariantGroupRows,
  getVariantOptionRows,
  mapPublicCategories,
  mapPublicDishes,
} from "../entities/menu/public-menu";
import {
  createBestPromotionMap,
  getPromotionCandidateRows,
  getPromotionRows,
  isPromotionLikeActiveNow,
  mapPromotion,
} from "../entities/promotions/public-menu";
import { createTranslationsMap, getTranslationRows } from "../entities/translations/public-menu";

import type { GetPublicMenuInput } from "./public-menu/shared";
import type { PublicBranch } from "../entities/branches/public-menu";
import type { PublicCategory } from "../entities/menu/public-menu";
import type { PublicPromotion } from "../entities/promotions/public-menu";

export type { PublicBranch, PublicBranchPhoto, PublicBranchSchedule } from "../entities/branches/public-menu";
export type {
  PublicAllergen,
  PublicCategory,
  PublicDish,
  PublicDishAvailabilityWindow,
  PublicDishVariantGroup,
  PublicDishVariantOption,
  PublicTag,
} from "../entities/menu/public-menu";
export type { PublicDishPromotion, PublicPromotion } from "../entities/promotions/public-menu";
export type { PublicTranslation } from "../entities/translations/public-menu";
export type { ResolvedTenant } from "./public-menu/shared";
export { getPublicBranch, normalizeTenantHost, resolveTenantByHost };

export interface PublicMenuData {
  branch: PublicBranch;
  categories: PublicCategory[];
  promotions: PublicPromotion[];
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
  const [availabilityRows, variantGroupRows, tagRows, allergenRows, promotionCandidateRows] = await Promise.all([
    getAvailabilityRows({ db, ids: dishIds }),
    getVariantGroupRows({ db, ids: dishIds }),
    getTagRows({ db, tenant, ids: dishIds }),
    getAllergenRows({ db, ids: dishIds }),
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
    promotionsById,
    tagRows,
    translationsByEntity,
    variantGroupRows,
    variantOptionRows,
  });

  return {
    branch,
    categories: mapPublicCategories({ categoryRows, dishesByCategory, translationsByEntity }),
    promotions: activePromotions.map(mapPromotion),
  };
}
