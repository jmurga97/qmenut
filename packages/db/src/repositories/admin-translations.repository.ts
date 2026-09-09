import { and, eq, isNull } from "drizzle-orm";

import { categories, dishes, dishExtras, dishVariantGroups, dishVariantOptions, ingredients } from "../schema/menu";

import type { DrizzleDb } from "../client";
import type { TranslationEntityType, TranslationField } from "./translations.repository";

export interface TranslatableText {
  entityId: string;
  entityType: TranslationEntityType;
  field: TranslationField;
  text: string;
}

interface BranchInput {
  branchId: string;
  db: DrizzleDb;
  restaurantId: string;
}

/** Ingredients used by this branch remain shared with any other branch using the same ingredient. */
export async function collectTranslatableTexts({
  branchId,
  db,
  restaurantId,
}: BranchInput): Promise<TranslatableText[]> {
  const categoryFilter = and(
    eq(categories.restaurantId, restaurantId),
    eq(categories.branchId, branchId),
    isNull(categories.deletedAt),
  );
  const dishFilter = and(
    eq(dishes.restaurantId, restaurantId),
    eq(dishes.branchId, branchId),
    isNull(dishes.deletedAt),
  );
  const ingredientFilter = and(dishFilter, eq(ingredients.restaurantId, restaurantId), isNull(ingredients.deletedAt));
  const [categoryRows, dishRows, variantGroupRows, variantOptionRows, ingredientRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, description: categories.description })
      .from(categories)
      .where(categoryFilter)
      .all(),
    db
      .select({ id: dishes.id, name: dishes.name, description: dishes.description })
      .from(dishes)
      .where(dishFilter)
      .all(),
    db
      .select({ id: dishVariantGroups.id, name: dishVariantGroups.name })
      .from(dishVariantGroups)
      .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
      .where(dishFilter)
      .all(),
    db
      .select({ id: dishVariantOptions.id, name: dishVariantOptions.name })
      .from(dishVariantOptions)
      .innerJoin(dishVariantGroups, eq(dishVariantOptions.groupId, dishVariantGroups.id))
      .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
      .where(dishFilter)
      .all(),
    db
      .selectDistinct({ id: ingredients.id, name: ingredients.name })
      .from(ingredients)
      .innerJoin(dishExtras, eq(dishExtras.ingredientId, ingredients.id))
      .innerJoin(dishes, eq(dishExtras.dishId, dishes.id))
      .where(ingredientFilter)
      .all(),
  ]);

  return [
    ...categoryRows.flatMap((row): TranslatableText[] => [
      { entityId: row.id, entityType: "category", field: "name", text: row.name },
      { entityId: row.id, entityType: "category", field: "description", text: row.description ?? "" },
    ]),
    ...dishRows.flatMap((row): TranslatableText[] => [
      { entityId: row.id, entityType: "dish", field: "name", text: row.name },
      { entityId: row.id, entityType: "dish", field: "description", text: row.description ?? "" },
    ]),
    ...variantGroupRows.map((row): TranslatableText => ({
      entityId: row.id,
      entityType: "variant_group",
      field: "name",
      text: row.name,
    })),
    ...variantOptionRows.map((row): TranslatableText => ({
      entityId: row.id,
      entityType: "variant_option",
      field: "name",
      text: row.name,
    })),
    ...ingredientRows.map((row): TranslatableText => ({
      entityId: row.id,
      entityType: "ingredient",
      field: "name",
      text: row.name,
    })),
  ];
}
