import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  categories,
  dishAllergens,
  dishExtras,
  dishTags,
  dishVariantGroups,
  dishVariantOptions,
  dishes,
} from "../schema/menu";
import { translations } from "../schema/translations";

import type { DrizzleDb } from "../client";
import type { BatchItem } from "drizzle-orm/batch";

export interface AdminDishListItem {
  id: string;
  categoryId: string;
  comboDescription: string | null;
  comboEnabled: boolean;
  comboPrice: number | null;
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
  variantGroup: DishVariantGroup | null;
}

/** Variantes de precio (p. ej. 15 cm / 30 cm). `price` es absoluto; en DB se guarda como delta sobre `dishes.price`. */
export interface DishVariantGroup {
  id: string;
  name: string;
  options: { id: string; name: string; price: number }[];
}

export interface DishVariantGroupWrite {
  id?: string;
  name: string;
  options: { id?: string; name: string; price: number }[];
}

export interface DishWriteData {
  categoryId: string;
  comboDescription: string | null;
  comboEnabled: boolean;
  comboPrice: number | null;
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
      comboDescription: dishes.comboDescription,
      comboEnabled: dishes.comboEnabled,
      comboPrice: dishes.comboPrice,
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

  const [tagRows, allergenRows, extraRows, variantRows] = await Promise.all([
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
    listDishVariantRows({ db, dishId }),
  ]);

  return {
    id: dish.id,
    categoryId: dish.categoryId,
    comboDescription: dish.comboDescription,
    comboEnabled: dish.comboEnabled,
    comboPrice: dish.comboPrice,
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
    variantGroup: toPriceVariantGroup({ basePrice: dish.price, rows: variantRows }),
  };
}

type DishVariantRow = Awaited<ReturnType<typeof listDishVariantRows>>[number];

function listDishVariantRows({ db, dishId }: { db: DrizzleDb; dishId: string }) {
  return db
    .select({
      groupId: dishVariantGroups.id,
      groupName: dishVariantGroups.name,
      optionId: dishVariantOptions.id,
      optionName: dishVariantOptions.name,
      priceDelta: dishVariantOptions.priceDelta,
    })
    .from(dishVariantGroups)
    .leftJoin(dishVariantOptions, eq(dishVariantOptions.groupId, dishVariantGroups.id))
    .where(eq(dishVariantGroups.dishId, dishId))
    .orderBy(asc(dishVariantGroups.position), asc(dishVariantOptions.position))
    .all();
}

/**
 * El grupo de variantes de precio es el primero cuyas opciones cuestan distinto (p. ej. 15 cm / 30 cm).
 * Los grupos de elección sin coste (sabor, bebida…) no fijan precios y el admin no los toca.
 */
function toPriceVariantGroup({
  basePrice,
  rows,
}: {
  basePrice: number;
  rows: DishVariantRow[];
}): DishVariantGroup | null {
  const isPriceGroup = (groupId: string) =>
    new Set(rows.filter((row) => row.groupId === groupId && row.optionId).map((row) => row.priceDelta)).size > 1;
  const groupRows = rows.filter(
    (row) => row.groupId === rows.find((candidate) => isPriceGroup(candidate.groupId))?.groupId,
  );
  const first = groupRows.at(0);
  if (!first) return null;

  const options = groupRows.flatMap((row) =>
    row.optionId && row.optionName !== null
      ? [{ id: row.optionId, name: row.optionName, price: basePrice + (row.priceDelta ?? 0) }]
      : [],
  );
  return { id: first.groupId, name: first.groupName, options };
}

export async function getDishPriceVariantGroup({
  db,
  dishId,
}: {
  db: DrizzleDb;
  dishId: string;
}): Promise<DishVariantGroup | null> {
  return toPriceVariantGroup({ basePrice: 0, rows: await listDishVariantRows({ db, dishId }) });
}

interface SetDishVariantsInput {
  db: DrizzleDb;
  dishId: string;
  existing: DishVariantGroup | null;
  group: DishVariantGroupWrite | null;
}

/**
 * Borrar-e-insertar el grupo de precio conservando los ids recibidos, para que sus traducciones sigan
 * valiendo. `dishes.price` pasa a ser el precio mínimo y cada opción guarda su delta sobre él.
 */
export function setDishVariantStatements({ db, dishId, existing, group }: SetDishVariantsInput): BatchItem<"sqlite">[] {
  const keptIds = new Set([group?.id, ...(group?.options.map((option) => option.id) ?? [])]);
  const existingIds = existing ? [existing.id, ...existing.options.map((option) => option.id)] : [];
  const removedIds = existingIds.filter((id) => !keptIds.has(id));
  const statements: BatchItem<"sqlite">[] = existing
    ? [db.delete(dishVariantGroups).where(eq(dishVariantGroups.id, existing.id))]
    : [];

  if (removedIds.length > 0) {
    const orphanTranslations = and(
      inArray(translations.entityType, ["variant_group", "variant_option"]),
      inArray(translations.entityId, removedIds),
    );
    statements.push(db.delete(translations).where(orphanTranslations));
  }
  if (!group) return statements;

  const groupId = group.id ?? crypto.randomUUID();
  const basePrice = Math.min(...group.options.map((option) => option.price));
  statements.push(
    db.insert(dishVariantGroups).values({
      id: groupId,
      dishId,
      name: group.name,
      selectionType: "single",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      position: 0,
    }),
    db.insert(dishVariantOptions).values(
      group.options.map((option, position) => ({
        id: option.id ?? crypto.randomUUID(),
        groupId,
        name: option.name,
        priceDelta: option.price - basePrice,
        position,
      })),
    ),
    db.update(dishes).set({ price: basePrice, updatedAt: Date.now() }).where(eq(dishes.id, dishId)),
  );
  return statements;
}

interface CreateDishInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  data: DishWriteData;
}

export function createDishStatement({
  db,
  restaurantId,
  branchId,
  data,
  id,
}: CreateDishInput & { id: string }): BatchItem<"sqlite"> {
  const now = Date.now();

  return db.insert(dishes).values({
    id,
    restaurantId,
    branchId,
    categoryId: data.categoryId,
    name: data.name,
    description: data.description,
    price: data.price,
    comboEnabled: data.comboEnabled,
    comboPrice: data.comboPrice,
    comboDescription: data.comboDescription,
    imageUrl: data.imageUrl,
    position: data.position,
    isActive: data.isActive,
    isRecommended: data.isRecommended,
    isFeatured: data.isFeatured,
    createdAt: now,
    updatedAt: now,
  });
}

export async function createDish(input: CreateDishInput): Promise<string> {
  const id = crypto.randomUUID();
  await input.db.batch([createDishStatement({ ...input, id })]);
  return id;
}

export interface DishContext {
  branchId: string;
  imageUrl: string | null;
}

interface GetDishContextInput {
  db: DrizzleDb;
  dishId: string;
  restaurantId: string;
}

export async function getDishContext({ db, dishId, restaurantId }: GetDishContextInput): Promise<DishContext | null> {
  const row = await db
    .select({ branchId: dishes.branchId, imageUrl: dishes.imageUrl })
    .from(dishes)
    .where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId), isNull(dishes.deletedAt)))
    .get();

  return row ?? null;
}

interface UpdateDishInput {
  preserveImage?: boolean;
  db: DrizzleDb;
  restaurantId: string;
  dishId: string;
  data: DishWriteData;
}

export function updateDishStatement({
  db,
  restaurantId,
  dishId,
  data,
  preserveImage,
}: UpdateDishInput): BatchItem<"sqlite"> {
  return db
    .update(dishes)
    .set({
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      comboEnabled: data.comboEnabled,
      comboPrice: data.comboPrice,
      comboDescription: data.comboDescription,
      imageUrl: preserveImage ? undefined : data.imageUrl,
      position: data.position,
      isActive: data.isActive,
      isRecommended: data.isRecommended,
      isFeatured: data.isFeatured,
      updatedAt: Date.now(),
    })
    .where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId), isNull(dishes.deletedAt)));
}

interface SetDishAvailabilityInput {
  branchId: string;
  db: DrizzleDb;
  dishId: string;
  isActive: boolean;
  restaurantId: string;
}

export async function setDishAvailability({
  branchId,
  db,
  dishId,
  isActive,
  restaurantId,
}: SetDishAvailabilityInput): Promise<void> {
  await db
    .update(dishes)
    .set({ isActive, updatedAt: Date.now() })
    .where(
      and(
        eq(dishes.id, dishId),
        eq(dishes.restaurantId, restaurantId),
        eq(dishes.branchId, branchId),
        isNull(dishes.deletedAt),
      ),
    );
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

export function setDishTagsStatements({
  db,
  dishId,
  tagIds,
}: SetDishTagsInput): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] {
  const remove = db.delete(dishTags).where(eq(dishTags.dishId, dishId));

  return tagIds.length > 0
    ? [remove, db.insert(dishTags).values(tagIds.map((tagId) => ({ dishId, tagId })))]
    : [remove];
}

interface SetDishAllergensInput {
  db: DrizzleDb;
  dishId: string;
  allergenIds: number[];
}

export function setDishAllergensStatements({
  db,
  dishId,
  allergenIds,
}: SetDishAllergensInput): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] {
  const remove = db.delete(dishAllergens).where(eq(dishAllergens.dishId, dishId));

  return allergenIds.length > 0
    ? [remove, db.insert(dishAllergens).values(allergenIds.map((allergenId) => ({ dishId, allergenId })))]
    : [remove];
}

interface SetDishExtrasInput {
  db: DrizzleDb;
  dishId: string;
  ingredientIds: string[];
}

export function setDishExtrasStatements({
  db,
  dishId,
  ingredientIds,
}: SetDishExtrasInput): [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] {
  const remove = db.delete(dishExtras).where(eq(dishExtras.dishId, dishId));

  return ingredientIds.length > 0
    ? [
        remove,
        db
          .insert(dishExtras)
          .values(ingredientIds.map((ingredientId, position) => ({ dishId, ingredientId, position }))),
      ]
    : [remove];
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
