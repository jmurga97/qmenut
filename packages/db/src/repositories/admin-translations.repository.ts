import { and, eq, isNull } from "drizzle-orm";

import { categories, dishes, dishVariantGroups, dishVariantOptions, ingredients } from "../schema/menu";

import type { DrizzleDb } from "../client";
import type { TranslationEntityType } from "./translations.repository";

export interface TranslatableText {
  entityId: string;
  entityType: TranslationEntityType;
  field: "description" | "name";
  text: string;
}

interface RestaurantInput {
  db: DrizzleDb;
  restaurantId: string;
}

/** Gathers every translatable name/description across all of a restaurant's branches. */
export async function collectTranslatableTexts({ db, restaurantId }: RestaurantInput): Promise<TranslatableText[]> {
  const [categoryRows, dishRows, variantGroupRows, variantOptionRows, ingredientRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, description: categories.description })
      .from(categories)
      .where(and(eq(categories.restaurantId, restaurantId), isNull(categories.deletedAt)))
      .all(),
    db
      .select({ id: dishes.id, name: dishes.name, description: dishes.description })
      .from(dishes)
      .where(and(eq(dishes.restaurantId, restaurantId), isNull(dishes.deletedAt)))
      .all(),
    db
      .select({ id: dishVariantGroups.id, name: dishVariantGroups.name })
      .from(dishVariantGroups)
      .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
      .where(and(eq(dishes.restaurantId, restaurantId), isNull(dishes.deletedAt)))
      .all(),
    db
      .select({ id: dishVariantOptions.id, name: dishVariantOptions.name })
      .from(dishVariantOptions)
      .innerJoin(dishVariantGroups, eq(dishVariantOptions.groupId, dishVariantGroups.id))
      .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
      .where(and(eq(dishes.restaurantId, restaurantId), isNull(dishes.deletedAt)))
      .all(),
    db
      .select({ id: ingredients.id, name: ingredients.name })
      .from(ingredients)
      .where(and(eq(ingredients.restaurantId, restaurantId), isNull(ingredients.deletedAt)))
      .all(),
  ]);

  const texts: TranslatableText[] = [];

  for (const row of categoryRows) {
    texts.push({ entityId: row.id, entityType: "category", field: "name", text: row.name });

    if (row.description) {
      texts.push({ entityId: row.id, entityType: "category", field: "description", text: row.description });
    }
  }

  for (const row of dishRows) {
    texts.push({ entityId: row.id, entityType: "dish", field: "name", text: row.name });

    if (row.description) {
      texts.push({ entityId: row.id, entityType: "dish", field: "description", text: row.description });
    }
  }

  for (const row of variantGroupRows) {
    texts.push({ entityId: row.id, entityType: "variant_group", field: "name", text: row.name });
  }

  for (const row of variantOptionRows) {
    texts.push({ entityId: row.id, entityType: "variant_option", field: "name", text: row.name });
  }

  for (const row of ingredientRows) {
    texts.push({ entityId: row.id, entityType: "ingredient", field: "name", text: row.name });
  }

  return texts;
}

interface BranchInput {
  branchId: string;
  db: DrizzleDb;
  restaurantId: string;
}

export interface TranslatableCategoryRow {
  description: string | null;
  id: string;
  name: string;
}

export interface TranslatableDishRow {
  categoryId: string;
  description: string | null;
  id: string;
  name: string;
}

export interface TranslatableVariantGroupRow {
  dishId: string;
  id: string;
  name: string;
}

export interface TranslatableVariantOptionRow {
  groupId: string;
  id: string;
  name: string;
}

export interface TranslatableIngredientRow {
  id: string;
  name: string;
}

export interface BranchTranslatableCatalog {
  categories: TranslatableCategoryRow[];
  dishes: TranslatableDishRow[];
  ingredients: TranslatableIngredientRow[];
  variantGroups: TranslatableVariantGroupRow[];
  variantOptions: TranslatableVariantOptionRow[];
}

/** Same entities as `collectTranslatableTexts`, scoped to one branch and shaped for the CRM editor. */
export async function getBranchTranslatableCatalog({
  branchId,
  db,
  restaurantId,
}: BranchInput): Promise<BranchTranslatableCatalog> {
  const [categoryRows, dishRows, ingredientRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, description: categories.description })
      .from(categories)
      .where(
        and(eq(categories.restaurantId, restaurantId), eq(categories.branchId, branchId), isNull(categories.deletedAt)),
      )
      .all(),
    db
      .select({
        id: dishes.id,
        categoryId: dishes.categoryId,
        name: dishes.name,
        description: dishes.description,
      })
      .from(dishes)
      .where(and(eq(dishes.restaurantId, restaurantId), eq(dishes.branchId, branchId), isNull(dishes.deletedAt)))
      .all(),
    db
      .select({ id: ingredients.id, name: ingredients.name })
      .from(ingredients)
      .where(and(eq(ingredients.restaurantId, restaurantId), isNull(ingredients.deletedAt)))
      .all(),
  ]);

  const dishIds = dishRows.map((row) => row.id);
  const variantGroupRows =
    dishIds.length === 0
      ? []
      : await db
          .select({ id: dishVariantGroups.id, dishId: dishVariantGroups.dishId, name: dishVariantGroups.name })
          .from(dishVariantGroups)
          .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
          .where(and(eq(dishes.restaurantId, restaurantId), eq(dishes.branchId, branchId)))
          .all();

  const groupIds = variantGroupRows.map((row) => row.id);
  const variantOptionRows =
    groupIds.length === 0
      ? []
      : await db
          .select({ id: dishVariantOptions.id, groupId: dishVariantOptions.groupId, name: dishVariantOptions.name })
          .from(dishVariantOptions)
          .innerJoin(dishVariantGroups, eq(dishVariantOptions.groupId, dishVariantGroups.id))
          .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
          .where(and(eq(dishes.restaurantId, restaurantId), eq(dishes.branchId, branchId)))
          .all();

  return {
    categories: categoryRows,
    dishes: dishRows,
    ingredients: ingredientRows,
    variantGroups: variantGroupRows,
    variantOptions: variantOptionRows,
  };
}

interface EntityBelongsToRestaurantInput {
  db: DrizzleDb;
  entityId: string;
  entityType: TranslationEntityType;
  restaurantId: string;
}

/** Ownership guard before writing a manual translation — translations aren't branch-scoped. */
export async function entityBelongsToRestaurant({
  db,
  entityId,
  entityType,
  restaurantId,
}: EntityBelongsToRestaurantInput): Promise<boolean> {
  switch (entityType) {
    case "category": {
      const row = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, entityId), eq(categories.restaurantId, restaurantId)))
        .get();

      return Boolean(row);
    }
    case "dish": {
      const row = await db
        .select({ id: dishes.id })
        .from(dishes)
        .where(and(eq(dishes.id, entityId), eq(dishes.restaurantId, restaurantId)))
        .get();

      return Boolean(row);
    }
    case "variant_group": {
      const row = await db
        .select({ id: dishVariantGroups.id })
        .from(dishVariantGroups)
        .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
        .where(and(eq(dishVariantGroups.id, entityId), eq(dishes.restaurantId, restaurantId)))
        .get();

      return Boolean(row);
    }
    case "variant_option": {
      const row = await db
        .select({ id: dishVariantOptions.id })
        .from(dishVariantOptions)
        .innerJoin(dishVariantGroups, eq(dishVariantOptions.groupId, dishVariantGroups.id))
        .innerJoin(dishes, eq(dishVariantGroups.dishId, dishes.id))
        .where(and(eq(dishVariantOptions.id, entityId), eq(dishes.restaurantId, restaurantId)))
        .get();

      return Boolean(row);
    }
    case "ingredient": {
      const row = await db
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(and(eq(ingredients.id, entityId), eq(ingredients.restaurantId, restaurantId)))
        .get();

      return Boolean(row);
    }
    default:
      return false;
  }
}
