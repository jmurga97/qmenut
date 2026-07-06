import { getBranchTranslatableCatalog } from "@qmenut/db/repositories/admin-translations.repository";
import { listTranslationsForLanguage } from "@qmenut/db/repositories/translations.repository";

import type {
  TranslatableCategoryRow,
  TranslatableDishRow,
  TranslatableIngredientRow,
  TranslatableVariantGroupRow,
  TranslatableVariantOptionRow,
} from "@qmenut/db/repositories/admin-translations.repository";
import type { TranslationRow } from "@qmenut/db/repositories/translations.repository";
import type { DrizzleDb } from "@qmenut/db";

type FieldName = "description" | "name";
type TranslationEntityType = TranslationRow["entityType"];

export interface TranslatableField {
  base: string | null;
  field: FieldName;
  source: TranslationRow["source"] | null;
  status: TranslationRow["status"] | null;
  value: string | null;
}

export interface TranslatableEntity {
  entityId: string;
  entityType: TranslationEntityType;
  fields: TranslatableField[];
}

export interface TranslatableDishEntity extends TranslatableEntity {
  variantGroups: (TranslatableEntity & { options: TranslatableEntity[] })[];
}

export interface TranslatableCategoryEntity extends TranslatableEntity {
  dishes: TranslatableDishEntity[];
}

export interface TranslationsStats {
  missing: number;
  pending: number;
  total: number;
  translated: number;
}

export interface TranslationsCatalog {
  categories: TranslatableCategoryEntity[];
  ingredients: TranslatableEntity[];
  stats: TranslationsStats;
}

interface ListTranslationsInput {
  branchId: string;
  db: DrizzleDb;
  languageCode: string;
  restaurantId: string;
}

class StatsAccumulator {
  missing = 0;
  pending = 0;
  total = 0;
  translated = 0;

  add(status: TranslationRow["status"] | null) {
    this.total += 1;

    if (status === "ok") {
      this.translated += 1;
    } else if (status === "pending_update") {
      this.pending += 1;
    } else {
      this.missing += 1;
    }
  }
}

export async function listTranslations({
  branchId,
  db,
  languageCode,
  restaurantId,
}: ListTranslationsInput): Promise<TranslationsCatalog> {
  const [catalog, translationRows] = await Promise.all([
    getBranchTranslatableCatalog({ branchId, db, restaurantId }),
    listTranslationsForLanguage({ db, languageCode, restaurantId }),
  ]);
  const translationByKey = new Map(
    translationRows.map((row) => [`${row.entityType}:${row.entityId}:${row.field}`, row] as const),
  );
  const stats = new StatsAccumulator();

  function buildField({
    base,
    entityId,
    entityType,
    field,
  }: {
    base: string | null;
    entityId: string;
    entityType: TranslationEntityType;
    field: FieldName;
  }): TranslatableField {
    const translation = translationByKey.get(`${entityType}:${entityId}:${field}`);

    stats.add(translation?.status ?? null);

    return {
      base,
      field,
      source: translation?.source ?? null,
      status: translation?.status ?? null,
      value: translation?.value ?? null,
    };
  }

  function buildNameOnlyEntity(
    entityType: TranslationEntityType,
    row: TranslatableVariantGroupRow | TranslatableVariantOptionRow | TranslatableIngredientRow,
  ): TranslatableEntity {
    return {
      entityId: row.id,
      entityType,
      fields: [buildField({ base: row.name, entityId: row.id, entityType, field: "name" })],
    };
  }

  const optionsByGroup = new Map<string, TranslatableEntity[]>();

  for (const row of catalog.variantOptions) {
    const options = optionsByGroup.get(row.groupId) ?? [];

    options.push(buildNameOnlyEntity("variant_option", row));
    optionsByGroup.set(row.groupId, options);
  }

  const groupsByDish = new Map<string, (TranslatableEntity & { options: TranslatableEntity[] })[]>();

  for (const row of catalog.variantGroups) {
    const groups = groupsByDish.get(row.dishId) ?? [];

    groups.push({ ...buildNameOnlyEntity("variant_group", row), options: optionsByGroup.get(row.id) ?? [] });
    groupsByDish.set(row.dishId, groups);
  }

  function buildDishEntity(row: TranslatableDishRow): TranslatableDishEntity {
    return {
      entityId: row.id,
      entityType: "dish",
      fields: [
        buildField({ base: row.name, entityId: row.id, entityType: "dish", field: "name" }),
        buildField({ base: row.description, entityId: row.id, entityType: "dish", field: "description" }),
      ],
      variantGroups: groupsByDish.get(row.id) ?? [],
    };
  }

  const dishesByCategory = new Map<string, TranslatableDishEntity[]>();

  for (const row of catalog.dishes) {
    const dishesInCategory = dishesByCategory.get(row.categoryId) ?? [];

    dishesInCategory.push(buildDishEntity(row));
    dishesByCategory.set(row.categoryId, dishesInCategory);
  }

  function buildCategoryEntity(row: TranslatableCategoryRow): TranslatableCategoryEntity {
    return {
      entityId: row.id,
      entityType: "category",
      fields: [
        buildField({ base: row.name, entityId: row.id, entityType: "category", field: "name" }),
        buildField({ base: row.description, entityId: row.id, entityType: "category", field: "description" }),
      ],
      dishes: dishesByCategory.get(row.id) ?? [],
    };
  }

  const categories = catalog.categories.map(buildCategoryEntity);
  const ingredients = catalog.ingredients.map((row) => buildNameOnlyEntity("ingredient", row));

  return {
    categories,
    ingredients,
    stats: { missing: stats.missing, pending: stats.pending, total: stats.total, translated: stats.translated },
  };
}
