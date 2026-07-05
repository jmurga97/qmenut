import { and, asc, eq, inArray } from "drizzle-orm";

import { translations } from "../schema/translations";

import type { DrizzleDb } from "../client";
import type { ResolvedTenant } from "../domain/tenant";
import type { PublicTranslation } from "../models/translation";

interface TenantIdsInput {
  db: DrizzleDb;
  ids: string[];
  tenant: ResolvedTenant;
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
