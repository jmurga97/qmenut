import { and, asc, eq, isNull, or } from "drizzle-orm";

import { allergens, ingredients, tags } from "../schema/menu";

import type { DrizzleDb } from "../client";

export interface AdminTag {
  id: string;
  code: string | null;
  label: string | null;
  color: string | null;
  isSystem: boolean;
}

export interface AdminAllergen {
  id: number;
  code: string;
}

export interface AdminIngredient {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface ListTagsInput {
  db: DrizzleDb;
  restaurantId: string;
}

/** Tags disponibles para el restaurante: los de sistema más los propios. */
export async function listTags({ db, restaurantId }: ListTagsInput): Promise<AdminTag[]> {
  return db
    .select({
      id: tags.id,
      code: tags.code,
      label: tags.label,
      color: tags.color,
      isSystem: tags.isSystem,
    })
    .from(tags)
    .where(or(eq(tags.isSystem, true), eq(tags.restaurantId, restaurantId)))
    .orderBy(asc(tags.isSystem))
    .all();
}

export async function listAllergens({ db }: { db: DrizzleDb }): Promise<AdminAllergen[]> {
  return db.select({ id: allergens.id, code: allergens.code }).from(allergens).orderBy(asc(allergens.id)).all();
}

interface ListIngredientsInput {
  db: DrizzleDb;
  restaurantId: string;
}

export async function listIngredients({ db, restaurantId }: ListIngredientsInput): Promise<AdminIngredient[]> {
  return db
    .select({
      id: ingredients.id,
      name: ingredients.name,
      price: ingredients.price,
      isActive: ingredients.isActive,
    })
    .from(ingredients)
    .where(and(eq(ingredients.restaurantId, restaurantId), isNull(ingredients.deletedAt)))
    .orderBy(asc(ingredients.name))
    .all();
}

interface CreateIngredientInput {
  db: DrizzleDb;
  restaurantId: string;
  data: { name: string; price: number; isActive: boolean };
}

export async function createIngredient({ db, restaurantId, data }: CreateIngredientInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(ingredients).values({
    id,
    restaurantId,
    name: data.name,
    price: data.price,
    isActive: data.isActive,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

interface UpdateIngredientInput extends CreateIngredientInput {
  ingredientId: string;
}

export async function updateIngredient({
  db,
  restaurantId,
  ingredientId,
  data,
}: UpdateIngredientInput): Promise<boolean> {
  const result = await db
    .update(ingredients)
    .set({ name: data.name, price: data.price, isActive: data.isActive, updatedAt: Date.now() })
    .where(
      and(eq(ingredients.id, ingredientId), eq(ingredients.restaurantId, restaurantId), isNull(ingredients.deletedAt)),
    )
    .run();

  return result.meta.changes === 1;
}

interface SoftDeleteIngredientInput {
  db: DrizzleDb;
  restaurantId: string;
  ingredientId: string;
}

export async function softDeleteIngredient({
  db,
  restaurantId,
  ingredientId,
}: SoftDeleteIngredientInput): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .update(ingredients)
    .set({ deletedAt: now, isActive: false, updatedAt: now })
    .where(
      and(eq(ingredients.id, ingredientId), eq(ingredients.restaurantId, restaurantId), isNull(ingredients.deletedAt)),
    )
    .run();

  return result.meta.changes === 1;
}
