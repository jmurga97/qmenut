import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";

import {
  allergens,
  categories,
  dishes,
  dishAllergens,
  dishAvailabilityWindows,
  dishTags,
  dishVariantGroups,
  dishVariantOptions,
  tags,
} from "./schema";
import { appendMapValue } from "../../repositories/public-menu/shared";
import { mapDishPromotion } from "../promotions/public-menu";

import type { IdsInput, TenantIdsInput, TenantInput } from "../../repositories/public-menu/shared";
import type { PromotionCandidateRow, PromotionRow, PublicDishPromotion } from "../promotions/public-menu";
import type { PublicTranslation } from "../translations/public-menu";

export interface PublicDishAvailabilityWindow {
  dayOfWeek: number;
  endMinute: number;
  id: string;
  startMinute: number;
}

export interface PublicDishVariantOption {
  id: string;
  name: string;
  position: number;
  priceDelta: number;
  translations: PublicTranslation[];
}

export interface PublicDishVariantGroup {
  id: string;
  isRequired: boolean;
  maxSelect: number | null;
  minSelect: number;
  name: string;
  options: PublicDishVariantOption[];
  position: number;
  selectionType: "multiple" | "single";
  translations: PublicTranslation[];
}

export interface PublicTag {
  code: string | null;
  color: string | null;
  id: string;
  isSystem: boolean;
  label: string | null;
}

export interface PublicAllergen {
  code: string;
  id: number;
}

export interface PublicDish {
  allergens: PublicAllergen[];
  availabilityWindows: PublicDishAvailabilityWindow[];
  categoryId: string;
  description: string | null;
  id: string;
  imageUrl: string | null;
  isFeatured: boolean;
  isRecommended: boolean;
  name: string;
  position: number;
  price: number;
  promotion: PublicDishPromotion | null;
  tags: PublicTag[];
  translations: PublicTranslation[];
  variantGroups: PublicDishVariantGroup[];
}

export interface PublicCategory {
  description: string | null;
  dishes: PublicDish[];
  id: string;
  imageUrl: string | null;
  name: string;
  position: number;
  translations: PublicTranslation[];
}

export async function getCategoryRows({ db, tenant }: TenantInput) {
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

export async function getDishRows({ db, tenant }: TenantInput) {
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

export async function getAvailabilityRows({ db, ids }: IdsInput) {
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

export async function getVariantGroupRows({ db, ids }: IdsInput) {
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

export async function getVariantOptionRows({ db, ids }: IdsInput) {
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

export async function getTagRows({ db, ids, tenant }: TenantIdsInput) {
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

export async function getAllergenRows({ db, ids }: IdsInput) {
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

function createAvailabilityByDish(
  rows: Awaited<ReturnType<typeof getAvailabilityRows>>,
): Map<string, PublicDishAvailabilityWindow[]> {
  const availabilityByDish = new Map<string, PublicDishAvailabilityWindow[]>();

  for (const row of rows) {
    appendMapValue({
      map: availabilityByDish,
      key: row.dishId,
      value: {
        id: row.id,
        dayOfWeek: row.dayOfWeek,
        startMinute: row.startMinute,
        endMinute: row.endMinute,
      },
    });
  }

  return availabilityByDish;
}

function createTagsByDish(rows: Awaited<ReturnType<typeof getTagRows>>): Map<string, PublicTag[]> {
  const tagsByDish = new Map<string, PublicTag[]>();

  for (const row of rows) {
    appendMapValue({
      map: tagsByDish,
      key: row.dishId,
      value: {
        id: row.id,
        code: row.code,
        label: row.label,
        color: row.color,
        isSystem: row.isSystem,
      },
    });
  }

  return tagsByDish;
}

function createAllergensByDish(rows: Awaited<ReturnType<typeof getAllergenRows>>): Map<string, PublicAllergen[]> {
  const allergensByDish = new Map<string, PublicAllergen[]>();

  for (const row of rows) {
    appendMapValue({ map: allergensByDish, key: row.dishId, value: { id: row.id, code: row.code } });
  }

  return allergensByDish;
}

export function mapPublicDishes({
  allergenRows,
  availabilityRows,
  bestPromotionsByDish,
  dishRows,
  promotionsById,
  tagRows,
  translationsByEntity,
  variantGroupRows,
  variantOptionRows,
}: {
  allergenRows: Awaited<ReturnType<typeof getAllergenRows>>;
  availabilityRows: Awaited<ReturnType<typeof getAvailabilityRows>>;
  bestPromotionsByDish: Map<string, PromotionCandidateRow>;
  dishRows: Awaited<ReturnType<typeof getDishRows>>;
  promotionsById: Map<string, PromotionRow>;
  tagRows: Awaited<ReturnType<typeof getTagRows>>;
  translationsByEntity: Map<string, PublicTranslation[]>;
  variantGroupRows: Awaited<ReturnType<typeof getVariantGroupRows>>;
  variantOptionRows: Awaited<ReturnType<typeof getVariantOptionRows>>;
}): Map<string, PublicDish[]> {
  const availabilityByDish = createAvailabilityByDish(availabilityRows);
  const groupsByDish = createVariantGroupsByDish({ translationsByEntity, variantGroupRows, variantOptionRows });
  const tagsByDish = createTagsByDish(tagRows);
  const allergensByDish = createAllergensByDish(allergenRows);
  const dishesByCategory = new Map<string, PublicDish[]>();

  for (const row of dishRows) {
    const candidate = bestPromotionsByDish.get(row.id);
    const promotion = candidate ? promotionsById.get(candidate.promotionId) : undefined;

    appendMapValue({
      map: dishesByCategory,
      key: row.categoryId,
      value: {
        id: row.id,
        categoryId: row.categoryId,
        name: row.name,
        description: row.description,
        price: row.price,
        imageUrl: row.imageUrl,
        position: row.position,
        isRecommended: row.isRecommended,
        isFeatured: row.isFeatured,
        availabilityWindows: availabilityByDish.get(row.id) ?? [],
        variantGroups: groupsByDish.get(row.id) ?? [],
        tags: tagsByDish.get(row.id) ?? [],
        allergens: allergensByDish.get(row.id) ?? [],
        translations: translationsByEntity.get(row.id) ?? [],
        promotion: candidate && promotion ? mapDishPromotion({ candidate, promotion }) : null,
      },
    });
  }

  return dishesByCategory;
}

export function mapPublicCategories({
  categoryRows,
  dishesByCategory,
  translationsByEntity,
}: {
  categoryRows: Awaited<ReturnType<typeof getCategoryRows>>;
  dishesByCategory: Map<string, PublicDish[]>;
  translationsByEntity: Map<string, PublicTranslation[]>;
}): PublicCategory[] {
  return categoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    position: row.position,
    translations: translationsByEntity.get(row.id) ?? [],
    dishes: dishesByCategory.get(row.id) ?? [],
  }));
}

function createVariantGroupsByDish({
  translationsByEntity,
  variantGroupRows,
  variantOptionRows,
}: {
  translationsByEntity: Map<string, PublicTranslation[]>;
  variantGroupRows: Awaited<ReturnType<typeof getVariantGroupRows>>;
  variantOptionRows: Awaited<ReturnType<typeof getVariantOptionRows>>;
}): Map<string, PublicDishVariantGroup[]> {
  const optionsByGroup = new Map<string, PublicDishVariantOption[]>();
  const groupsByDish = new Map<string, PublicDishVariantGroup[]>();

  for (const row of variantOptionRows) {
    appendMapValue({
      map: optionsByGroup,
      key: row.groupId,
      value: {
        id: row.id,
        name: row.name,
        priceDelta: row.priceDelta,
        position: row.position,
        translations: translationsByEntity.get(row.id) ?? [],
      },
    });
  }

  for (const row of variantGroupRows) {
    appendMapValue({
      map: groupsByDish,
      key: row.dishId,
      value: {
        id: row.id,
        name: row.name,
        selectionType: row.selectionType,
        isRequired: row.isRequired,
        minSelect: row.minSelect,
        maxSelect: row.maxSelect,
        position: row.position,
        options: optionsByGroup.get(row.id) ?? [],
        translations: translationsByEntity.get(row.id) ?? [],
      },
    });
  }

  return groupsByDish;
}
