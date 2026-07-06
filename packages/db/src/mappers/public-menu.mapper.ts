import { mapDishPromotion } from "./promotion.mapper";
import { appendMapValue } from "../utils/append-map-value";

import type { PromotionCandidateRow, PromotionRow } from "./promotion.mapper";
import type {
  PublicAllergen,
  PublicCategory,
  PublicDish,
  PublicDishAvailabilityWindow,
  PublicDishExtra,
  PublicDishVariantGroup,
  PublicDishVariantOption,
  PublicTag,
} from "../models/public-menu";
import type { PublicTranslation } from "../models/translation";
import type {
  AllergenRow,
  AvailabilityRow,
  CategoryRow,
  DishRow,
  ExtraRow,
  TagRow,
  VariantGroupRow,
  VariantOptionRow,
} from "../repositories/public-menu.repository";

export type TranslationFieldMap = Map<string, Map<string, string>>;

export function createTranslationFieldMap(rows: PublicTranslation[]): TranslationFieldMap {
  const map: TranslationFieldMap = new Map();

  for (const row of rows) {
    const fields = map.get(row.entityId);

    if (fields) {
      fields.set(row.field, row.value);
      continue;
    }

    map.set(row.entityId, new Map([[row.field, row.value]]));
  }

  return map;
}

function translateField<Fallback extends string | null>({
  entityId,
  fallback,
  field,
  translationsByEntity,
}: {
  entityId: string;
  fallback: Fallback;
  field: string;
  translationsByEntity: TranslationFieldMap;
}): string | Fallback {
  return translationsByEntity.get(entityId)?.get(field) ?? fallback;
}

function createAvailabilityByDish(rows: AvailabilityRow[]): Map<string, PublicDishAvailabilityWindow[]> {
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

function createTagsByDish(rows: TagRow[]): Map<string, PublicTag[]> {
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

function createAllergensByDish(rows: AllergenRow[]): Map<string, PublicAllergen[]> {
  const allergensByDish = new Map<string, PublicAllergen[]>();

  for (const row of rows) {
    appendMapValue({ map: allergensByDish, key: row.dishId, value: { id: row.id, code: row.code } });
  }

  return allergensByDish;
}

function createExtrasByDish({
  extraRows,
  translationsByEntity,
}: {
  extraRows: ExtraRow[];
  translationsByEntity: TranslationFieldMap;
}): Map<string, PublicDishExtra[]> {
  const extrasByDish = new Map<string, PublicDishExtra[]>();

  for (const row of extraRows) {
    appendMapValue({
      map: extrasByDish,
      key: row.dishId,
      value: {
        id: row.id,
        name: translateField({ entityId: row.id, fallback: row.name, field: "name", translationsByEntity }),
        price: row.price,
        position: row.position,
      },
    });
  }

  return extrasByDish;
}

function createVariantGroupsByDish({
  translationsByEntity,
  variantGroupRows,
  variantOptionRows,
}: {
  translationsByEntity: TranslationFieldMap;
  variantGroupRows: VariantGroupRow[];
  variantOptionRows: VariantOptionRow[];
}): Map<string, PublicDishVariantGroup[]> {
  const optionsByGroup = new Map<string, PublicDishVariantOption[]>();
  const groupsByDish = new Map<string, PublicDishVariantGroup[]>();

  for (const row of variantOptionRows) {
    appendMapValue({
      map: optionsByGroup,
      key: row.groupId,
      value: {
        id: row.id,
        name: translateField({ entityId: row.id, fallback: row.name, field: "name", translationsByEntity }),
        priceDelta: row.priceDelta,
        position: row.position,
      },
    });
  }

  for (const row of variantGroupRows) {
    appendMapValue({
      map: groupsByDish,
      key: row.dishId,
      value: {
        id: row.id,
        name: translateField({ entityId: row.id, fallback: row.name, field: "name", translationsByEntity }),
        selectionType: row.selectionType,
        isRequired: row.isRequired,
        minSelect: row.minSelect,
        maxSelect: row.maxSelect,
        position: row.position,
        options: optionsByGroup.get(row.id) ?? [],
      },
    });
  }

  return groupsByDish;
}

export function mapPublicDishes({
  allergenRows,
  availabilityRows,
  bestPromotionsByDish,
  dishRows,
  extraRows,
  promotionsById,
  tagRows,
  translationsByEntity,
  variantGroupRows,
  variantOptionRows,
}: {
  allergenRows: AllergenRow[];
  availabilityRows: AvailabilityRow[];
  bestPromotionsByDish: Map<string, PromotionCandidateRow>;
  dishRows: DishRow[];
  extraRows: ExtraRow[];
  promotionsById: Map<string, PromotionRow>;
  tagRows: TagRow[];
  translationsByEntity: TranslationFieldMap;
  variantGroupRows: VariantGroupRow[];
  variantOptionRows: VariantOptionRow[];
}): Map<string, PublicDish[]> {
  const availabilityByDish = createAvailabilityByDish(availabilityRows);
  const groupsByDish = createVariantGroupsByDish({ translationsByEntity, variantGroupRows, variantOptionRows });
  const tagsByDish = createTagsByDish(tagRows);
  const allergensByDish = createAllergensByDish(allergenRows);
  const extrasByDish = createExtrasByDish({ extraRows, translationsByEntity });
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
        name: translateField({ entityId: row.id, fallback: row.name, field: "name", translationsByEntity }),
        description: translateField({
          entityId: row.id,
          fallback: row.description,
          field: "description",
          translationsByEntity,
        }),
        price: row.price,
        imageUrl: row.imageUrl,
        position: row.position,
        isRecommended: row.isRecommended,
        isFeatured: row.isFeatured,
        extras: extrasByDish.get(row.id) ?? [],
        availabilityWindows: availabilityByDish.get(row.id) ?? [],
        variantGroups: groupsByDish.get(row.id) ?? [],
        tags: tagsByDish.get(row.id) ?? [],
        allergens: allergensByDish.get(row.id) ?? [],
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
  categoryRows: CategoryRow[];
  dishesByCategory: Map<string, PublicDish[]>;
  translationsByEntity: TranslationFieldMap;
}): PublicCategory[] {
  return categoryRows.map((row) => ({
    id: row.id,
    name: translateField({ entityId: row.id, fallback: row.name, field: "name", translationsByEntity }),
    description: translateField({
      entityId: row.id,
      fallback: row.description,
      field: "description",
      translationsByEntity,
    }),
    imageUrl: row.imageUrl,
    position: row.position,
    dishes: dishesByCategory.get(row.id) ?? [],
  }));
}
