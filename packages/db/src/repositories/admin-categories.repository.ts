import { and, asc, eq, isNull } from "drizzle-orm";

import { categories } from "../schema/menu";

import type { DrizzleDb } from "../client";

export interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  isActive: boolean;
}

export interface CategoryWriteData {
  name: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  isActive: boolean;
}

interface ListCategoriesInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

export async function listCategories({ db, restaurantId, branchId }: ListCategoriesInput): Promise<AdminCategory[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      imageUrl: categories.imageUrl,
      position: categories.position,
      isActive: categories.isActive,
    })
    .from(categories)
    .where(
      and(eq(categories.restaurantId, restaurantId), eq(categories.branchId, branchId), isNull(categories.deletedAt)),
    )
    .orderBy(asc(categories.position))
    .all();
}

interface CreateCategoryInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  data: CategoryWriteData;
}

export async function createCategory({ db, restaurantId, branchId, data }: CreateCategoryInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(categories).values({
    id,
    restaurantId,
    branchId,
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    position: data.position,
    isActive: data.isActive,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export interface CategoryTranslatableFields {
  description: string | null;
  name: string;
}

interface GetCategoryTranslatableFieldsInput {
  categoryId: string;
  db: DrizzleDb;
  restaurantId: string;
}

export async function getCategoryTranslatableFields({
  categoryId,
  db,
  restaurantId,
}: GetCategoryTranslatableFieldsInput): Promise<CategoryTranslatableFields | null> {
  const row = await db
    .select({ name: categories.name, description: categories.description })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.restaurantId, restaurantId)))
    .get();

  return row ?? null;
}

interface UpdateCategoryInput {
  db: DrizzleDb;
  restaurantId: string;
  categoryId: string;
  data: CategoryWriteData;
}

export async function updateCategory({ db, restaurantId, categoryId, data }: UpdateCategoryInput): Promise<void> {
  await db
    .update(categories)
    .set({
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      position: data.position,
      isActive: data.isActive,
      updatedAt: Date.now(),
    })
    .where(and(eq(categories.id, categoryId), eq(categories.restaurantId, restaurantId)));
}

interface SoftDeleteCategoryInput {
  db: DrizzleDb;
  restaurantId: string;
  categoryId: string;
}

export async function softDeleteCategory({ db, restaurantId, categoryId }: SoftDeleteCategoryInput): Promise<void> {
  const now = Date.now();

  await db
    .update(categories)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(categories.id, categoryId), eq(categories.restaurantId, restaurantId)));
}
