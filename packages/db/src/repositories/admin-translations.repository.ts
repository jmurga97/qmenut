import { and, asc, eq, isNull } from "drizzle-orm";

import { loyaltyRewards } from "../schema/loyalty";
import { categories, dishes, dishExtras, dishVariantGroups, dishVariantOptions, ingredients } from "../schema/menu";
import { promotions } from "../schema/promotions";

import type { DrizzleDb } from "../client";
import type { TranslationEntityType, TranslationField } from "./translations.repository";

export interface TranslatableText {
  dishId?: string;
  entityId: string;
  entityType: TranslationEntityType;
  field: TranslationField;
  text: string;
}

interface BranchInput {
  branchId?: string;
  db: DrizzleDb;
  restaurantId: string;
}

/** Ingredients used by this branch remain shared with any other branch using the same ingredient. */
async function loadTranslationRows({ branchId, db, restaurantId }: BranchInput) {
  const categoryFilter = and(
    eq(categories.restaurantId, restaurantId),
    branchId ? eq(categories.branchId, branchId) : undefined,
    isNull(categories.deletedAt),
  );
  const dishFilter = and(
    eq(dishes.restaurantId, restaurantId),
    branchId ? eq(dishes.branchId, branchId) : undefined,
    isNull(dishes.deletedAt),
  );
  const ingredientFilter = and(dishFilter, eq(ingredients.restaurantId, restaurantId), isNull(ingredients.deletedAt));
  const promotionFilter = and(
    eq(promotions.restaurantId, restaurantId),
    branchId ? eq(promotions.branchId, branchId) : undefined,
    isNull(promotions.deletedAt),
  );
  const rewardFilter = and(eq(loyaltyRewards.restaurantId, restaurantId), isNull(loyaltyRewards.deletedAt));
  const [categoryRows, dishRows, variantGroupRows, variantOptionRows, ingredientRows, promotionRows, rewardRows] =
    await Promise.all([
      db
        .select({ id: categories.id, name: categories.name, description: categories.description })
        .from(categories)
        .where(categoryFilter)
        .orderBy(asc(categories.position))
        .all(),
      db
        .select({
          id: dishes.id,
          categoryId: dishes.categoryId,
          name: dishes.name,
          description: dishes.description,
          comboDescription: dishes.comboDescription,
        })
        .from(dishes)
        .where(dishFilter)
        .orderBy(asc(dishes.position))
        .all(),
      db
        .select({ id: dishVariantGroups.id, name: dishVariantGroups.name, dishId: dishes.id })
        .from(dishVariantGroups)
        .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
        .where(dishFilter)
        .orderBy(asc(dishVariantGroups.position))
        .all(),
      db
        .select({
          id: dishVariantOptions.id,
          name: dishVariantOptions.name,
          dishId: dishes.id,
          groupId: dishVariantOptions.groupId,
        })
        .from(dishVariantOptions)
        .innerJoin(dishVariantGroups, eq(dishVariantOptions.groupId, dishVariantGroups.id))
        .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
        .where(dishFilter)
        .orderBy(asc(dishVariantGroups.position))
        .all(),
      db
        .selectDistinct({ id: ingredients.id, name: ingredients.name })
        .from(ingredients)
        .innerJoin(dishExtras, eq(dishExtras.ingredientId, ingredients.id))
        .innerJoin(dishes, eq(dishExtras.dishId, dishes.id))
        .where(ingredientFilter)
        .all(),
      db
        .select({ id: promotions.id, name: promotions.name, description: promotions.description })
        .from(promotions)
        .where(promotionFilter)
        .all(),
      db
        .select({ id: loyaltyRewards.id, name: loyaltyRewards.name, description: loyaltyRewards.description })
        .from(loyaltyRewards)
        .where(rewardFilter)
        .all(),
    ]);

  return { categoryRows, dishRows, variantGroupRows, variantOptionRows, ingredientRows, promotionRows, rewardRows };
}

/** Menu texts follow the public carta: category, its dishes, and each dish's variants right below it. */
export async function collectTranslatableTexts(input: BranchInput): Promise<TranslatableText[]> {
  const { categoryRows, dishRows, variantGroupRows, variantOptionRows, ingredientRows, promotionRows, rewardRows } =
    await loadTranslationRows(input);
  const dishesByCategory = Map.groupBy(dishRows, (row) => row.categoryId);
  const groupsByDish = Map.groupBy(variantGroupRows, (row) => row.dishId);
  const optionsByGroup = Map.groupBy(variantOptionRows, (row) => row.groupId);
  const categoryIds = new Set(categoryRows.map((row) => row.id));
  const dishTexts = (row: (typeof dishRows)[number]): TranslatableText[] => [
    { entityId: row.id, entityType: "dish", field: "name", text: row.name },
    { entityId: row.id, entityType: "dish", field: "description", text: row.description ?? "" },
    { entityId: row.id, entityType: "dish", field: "comboDescription", text: row.comboDescription ?? "" },
    ...(groupsByDish.get(row.id) ?? []).flatMap((group): TranslatableText[] => [
      { dishId: row.id, entityId: group.id, entityType: "variant_group", field: "name", text: group.name },
      ...(optionsByGroup.get(group.id) ?? []).map((option): TranslatableText => ({
        dishId: row.id,
        entityId: option.id,
        entityType: "variant_option",
        field: "name",
        text: option.name,
      })),
    ]),
  ];
  return [
    ...categoryRows.flatMap((row): TranslatableText[] => [
      { entityId: row.id, entityType: "category", field: "name", text: row.name },
      { entityId: row.id, entityType: "category", field: "description", text: row.description ?? "" },
      ...(dishesByCategory.get(row.id) ?? []).flatMap((row) => dishTexts(row)),
    ]),
    ...dishRows.filter((row) => !categoryIds.has(row.categoryId)).flatMap((row) => dishTexts(row)),
    ...ingredientRows.map((row): TranslatableText => ({
      entityId: row.id,
      entityType: "ingredient",
      field: "name",
      text: row.name,
    })),
    ...promotionRows.flatMap((row): TranslatableText[] => [
      { entityId: row.id, entityType: "promotion", field: "name", text: row.name },
      { entityId: row.id, entityType: "promotion", field: "description", text: row.description ?? "" },
    ]),
    ...rewardRows.flatMap((row): TranslatableText[] => [
      { entityId: row.id, entityType: "reward", field: "name", text: row.name },
      { entityId: row.id, entityType: "reward", field: "description", text: row.description ?? "" },
    ]),
  ];
}
