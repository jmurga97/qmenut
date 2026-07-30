import type { TranslationRow, TranslationsCatalog, TranslationsFormValues } from "./types";

type TranslationEntity = TranslationsCatalog["ingredients"][number];
type Category = TranslationsCatalog["categories"][number];
type Dish = Category["dishes"][number];
type VariantGroup = Dish["variantGroups"][number];
const FIELD_LABELS = { description: "Descripción", name: "Nombre" } as const;
function entityLabel(entity: TranslationEntity): string {
  return entity.fields.find((field) => field.field === "name")?.base || entity.entityId;
}
function rowsFor(entity: TranslationEntity, groupPath: string): TranslationRow[] {
  return entity.fields.map((field) => ({
    entityId: entity.entityId,
    entityType: entity.entityType,
    field: field.field,
    fieldLabel: FIELD_LABELS[field.field],
    groupPath,
    base: field.base,
    source: field.source,
    status: field.status,
    value: field.value ?? "",
  }));
}
function variantRows(group: VariantGroup, dishPath: string): TranslationRow[] {
  const groupPath = `${dishPath} / Variantes · ${entityLabel(group)}`;
  return [
    ...rowsFor(group, groupPath),
    ...group.options.flatMap((option) => rowsFor(option, `${groupPath} / ${entityLabel(option)}`)),
  ];
}
function dishRows(dish: Dish, categoryPath: string): TranslationRow[] {
  const dishPath = `${categoryPath} / Plato · ${entityLabel(dish)}`;
  return [...rowsFor(dish, dishPath), ...dish.variantGroups.flatMap((group) => variantRows(group, dishPath))];
}
function categoryRows(category: Category): TranslationRow[] {
  const categoryPath = `Categoría · ${entityLabel(category)}`;
  return [...rowsFor(category, categoryPath), ...category.dishes.flatMap((dish) => dishRows(dish, categoryPath))];
}
export function toTranslationsFormValues(catalog: TranslationsCatalog): TranslationsFormValues {
  const nestedRows = catalog.categories.flatMap((category) => categoryRows(category));
  const ingredientRows = catalog.ingredients.flatMap((ingredient) =>
    rowsFor(ingredient, `Ingrediente · ${entityLabel(ingredient)}`),
  );
  return { rows: [...nestedRows, ...ingredientRows] };
}
export function translationStatus(row: TranslationRow): string {
  if (row.status === "pending_update") return "pendiente";
  if (row.status === "ok") return row.source === "manual" ? "manual" : "auto";
  return "sin traducir";
}
