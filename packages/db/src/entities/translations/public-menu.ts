import { and, asc, eq, inArray } from "drizzle-orm";

import { translations } from "./schema";
import { appendMapValue } from "../../repositories/public-menu/shared";

import type { TenantIdsInput } from "../../repositories/public-menu/shared";

export interface PublicTranslation {
  entityId: string;
  entityType: "category" | "dish" | "variant_group" | "variant_option";
  field: string;
  id: string;
  languageCode: string;
  value: string;
}

export async function getTranslationRows({ db, ids, tenant }: TenantIdsInput): Promise<PublicTranslation[]> {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select({
      id: translations.id,
      entityType: translations.entityType,
      entityId: translations.entityId,
      languageCode: translations.languageCode,
      field: translations.field,
      value: translations.value,
    })
    .from(translations)
    .where(and(eq(translations.restaurantId, tenant.restaurantId), inArray(translations.entityId, ids)))
    .orderBy(asc(translations.languageCode), asc(translations.entityType), asc(translations.field))
    .all();
}

export function createTranslationsMap(rows: PublicTranslation[]): Map<string, PublicTranslation[]> {
  const map = new Map<string, PublicTranslation[]>();

  for (const row of rows) {
    appendMapValue({ map, key: row.entityId, value: row });
  }

  return map;
}
