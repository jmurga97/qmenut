import { and, asc, eq, isNull } from "drizzle-orm";

import { categories, dishAllergens, dishExtras, dishTags, dishes } from "../schema/menu";

import type { DrizzleDb } from "../client";

export interface AdminDishListItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  position: number;
  isActive: boolean;
  isRecommended: boolean;
  isFeatured: boolean;
}

export interface AdminDishDetail extends AdminDishListItem {
  description: string | null;
  imageUrl: string | null;
  tagIds: string[];
  allergenIds: number[];
  extraIngredientIds: string[];
}

export interface DishWriteData {
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  position: number;
  isActive: boolean;
  isRecommended: boolean;
  isFeatured: boolean;
}

interface ListDishesInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

export async function listDishes({ db, restaurantId, branchId }: ListDishesInput): Promise<AdminDishListItem[]> {
  return db
    .select({
      id: dishes.id,
      categoryId: dishes.categoryId,
      name: dishes.name,
      price: dishes.price,
      position: dishes.position,
      isActive: dishes.isActive,
      isRecommended: dishes.isRecommended,
      isFeatured: dishes.isFeatured,
    })
    .from(dishes)
    .where(and(eq(dishes.restaurantId, restaurantId), eq(dishes.branchId, branchId), isNull(dishes.deletedAt)))
    .orderBy(asc(dishes.position))
    .all();
}

interface GetDishDetailInput {
  db: DrizzleDb;
  restaurantId: string;
  dishId: string;
}

export async function getDishDetail({ db, restaurantId, dishId }: GetDishDetailInput): Promise<AdminDishDetail | null> {
  const dish = await db
    .select()
    .from(dishes)
    .where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId), isNull(dishes.deletedAt)))
    .get();

  if (!dish) {
    return null;
  }

  const [tagRows, allergenRows, extraRows] = await Promise.all([
    db.select({ tagId: dishTags.tagId }).from(dishTags).where(eq(dishTags.dishId, dishId)).all(),
    db
      .select({ allergenId: dishAllergens.allergenId })
      .from(dishAllergens)
      .where(eq(dishAllergens.dishId, dishId))
      .all(),
    db
      .select({ ingredientId: dishExtras.ingredientId })
      .from(dishExtras)
      .where(eq(dishExtras.dishId, dishId))
      .orderBy(asc(dishExtras.position))
      .all(),
  ]);

  return {
    id: dish.id,
    categoryId: dish.categoryId,
    name: dish.name,
    description: dish.description,
    price: dish.price,
    imageUrl: dish.imageUrl,
    position: dish.position,
    isActive: dish.isActive,
    isRecommended: dish.isRecommended,
    isFeatured: dish.isFeatured,
    tagIds: tagRows.map((row) => row.tagId),
    allergenIds: allergenRows.map((row) => row.allergenId),
    extraIngredientIds: extraRows.map((row) => row.ingredientId),
  };
}

interface CreateDishInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  data: DishWriteData;
}

export async function createDish({ db, restaurantId, branchId, data }: CreateDishInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(dishes).values({
    id,
    restaurantId,
    branchId,
    categoryId: data.categoryId,
    name: data.name,
    description: data.description,
    price: data.price,
    imageUrl: data.imageUrl,
    position: data.position,
    isActive: data.isActive,
    isRecommended: data.isRecommended,
    isFeatured: data.isFeatured,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export interface DishTranslatableFields {
  description: string | null;
  name: string;
}

interface GetDishTranslatableFieldsInput {
  db: DrizzleDb;
  dishId: string;
  restaurantId: string;
}

export async function getDishTranslatableFields({
  db,
  dishId,
  restaurantId,
}: GetDishTranslatableFieldsInput): Promise<DishTranslatableFields | null> {
  const row = await db
    .select({ name: dishes.name, description: dishes.description })
    .from(dishes)
    .where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId)))
    .get();

  return row ?? null;
}

interface UpdateDishInput {
  db: DrizzleDb;
  restaurantId: string;
  dishId: string;
  data: DishWriteData;
}

export async function updateDish({ db, restaurantId, dishId, data }: UpdateDishInput): Promise<void> {
  await db
    .update(dishes)
    .set({
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      imageUrl: data.imageUrl,
      position: data.position,
      isActive: data.isActive,
      isRecommended: data.isRecommended,
      isFeatured: data.isFeatured,
      updatedAt: Date.now(),
    })
    .where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId)));
}

interface SoftDeleteDishInput {
  db: DrizzleDb;
  restaurantId: string;
  dishId: string;
}

export async function softDeleteDish({ db, restaurantId, dishId }: SoftDeleteDishInput): Promise<void> {
  const now = Date.now();

  await db
    .update(dishes)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId)));
}

interface SetDishTagsInput {
  db: DrizzleDb;
  dishId: string;
  tagIds: string[];
}

export async function setDishTags({ db, dishId, tagIds }: SetDishTagsInput): Promise<void> {
  await db.delete(dishTags).where(eq(dishTags.dishId, dishId));

  if (tagIds.length > 0) {
    await db.insert(dishTags).values(tagIds.map((tagId) => ({ dishId, tagId })));
  }
}

interface SetDishAllergensInput {
  db: DrizzleDb;
  dishId: string;
  allergenIds: number[];
}

export async function setDishAllergens({ db, dishId, allergenIds }: SetDishAllergensInput): Promise<void> {
  await db.delete(dishAllergens).where(eq(dishAllergens.dishId, dishId));

  if (allergenIds.length > 0) {
    await db.insert(dishAllergens).values(allergenIds.map((allergenId) => ({ dishId, allergenId })));
  }
}

interface SetDishExtrasInput {
  db: DrizzleDb;
  dishId: string;
  ingredientIds: string[];
}

export async function setDishExtras({ db, dishId, ingredientIds }: SetDishExtrasInput): Promise<void> {
  await db.delete(dishExtras).where(eq(dishExtras.dishId, dishId));

  if (ingredientIds.length > 0) {
    await db
      .insert(dishExtras)
      .values(ingredientIds.map((ingredientId, position) => ({ dishId, ingredientId, position })));
  }
}

interface DishBelongsToTenantInput {
  db: DrizzleDb;
  restaurantId: string;
  dishId: string;
}

/** Guard para relaciones: confirma que el plato es del tenant antes de tocar sus tablas hijas. */
export async function dishBelongsToTenant({ db, restaurantId, dishId }: DishBelongsToTenantInput): Promise<boolean> {
  const row = await db
    .select({ id: dishes.id })
    .from(dishes)
    .where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId), isNull(dishes.deletedAt)))
    .get();

  return Boolean(row);
}

interface CategoryBelongsToBranchInput {
  db: DrizzleDb;
  branchId: string;
  categoryId: string;
}

/** Los platos deben colgar de una categoría viva de la misma sucursal (FK compuesta en la DB). */
export async function categoryBelongsToBranch({
  db,
  branchId,
  categoryId,
}: CategoryBelongsToBranchInput): Promise<boolean> {
  const row = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.branchId, branchId), isNull(categories.deletedAt)))
    .get();

  return Boolean(row);
}
