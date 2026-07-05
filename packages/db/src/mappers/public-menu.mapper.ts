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

export function createTranslationsMap(rows: PublicTranslation[]): Map<string, PublicTranslation[]> {
  const map = new Map<string, PublicTranslation[]>();

  for (const row of rows) {
    appendMapValue({ map, key: row.entityId, value: row });
  }

  return map;
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
  translationsByEntity: Map<string, PublicTranslation[]>;
}): Map<string, PublicDishExtra[]> {
  const extrasByDish = new Map<string, PublicDishExtra[]>();

  for (const row of extraRows) {
    appendMapValue({
      map: extrasByDish,
      key: row.dishId,
      value: {
        id: row.id,
        name: row.name,
        price: row.price,
        position: row.position,
        translations: translationsByEntity.get(row.id) ?? [],
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
  translationsByEntity: Map<string, PublicTranslation[]>;
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
        name: row.name,
        priceDelta: row.priceDelta,
        position: row.position,
        translations: translationsByEntity.get(row.id) ?? [],
      },
    });
  }

  for (const row of variantGroupRows) {
    appendMapValue({
      map: groupsByDish,
      key: row.dishId,
      value: {
        id: row.id,
        name: row.name,
        selectionType: row.selectionType,
        isRequired: row.isRequired,
        minSelect: row.minSelect,
        maxSelect: row.maxSelect,
        position: row.position,
        options: optionsByGroup.get(row.id) ?? [],
        translations: translationsByEntity.get(row.id) ?? [],
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
  translationsByEntity: Map<string, PublicTranslation[]>;
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
        name: row.name,
        description: row.description,
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
        translations: translationsByEntity.get(row.id) ?? [],
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
  translationsByEntity: Map<string, PublicTranslation[]>;
}): PublicCategory[] {
  return categoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    position: row.position,
    translations: translationsByEntity.get(row.id) ?? [],
    dishes: dishesByCategory.get(row.id) ?? [],
  }));
}
