import { createTranslationFieldMap } from "@qmenut/db/mappers/public-menu.mapper";
import { translations } from "@qmenut/db/schema/translations";
import { and, eq, inArray } from "drizzle-orm";

import type { DrizzleDb } from "@qmenut/db/client";
import type { TranslationFieldMap } from "@qmenut/db/mappers/public-menu.mapper";

interface TranslationTextsInput {
  db: DrizzleDb;
  ids: string[];
  languageCode: string;
  restaurantId: string;
}

/**
 * Loads the stored translations for the given entity ids in one language.
 * Returns null when there is nothing stored, so callers can keep base texts untouched.
 */
export async function getTranslationTexts({
  db,
  ids,
  languageCode,
  restaurantId,
}: TranslationTextsInput): Promise<TranslationFieldMap | null> {
  if (ids.length === 0) {
    return null;
  }

  const rows = await db
    .select({
      entityId: translations.entityId,
      entityType: translations.entityType,
      field: translations.field,
      id: translations.id,
      languageCode: translations.languageCode,
      value: translations.value,
    })
    .from(translations)
    .where(
      and(
        eq(translations.restaurantId, restaurantId),
        eq(translations.languageCode, languageCode),
        inArray(translations.entityId, ids),
      ),
    )
    .all();

  if (rows.length === 0) {
    return null;
  }

  return createTranslationFieldMap(rows);
}

export function translateText<Fallback extends string | null>({
  entityId,
  fallback,
  field,
  texts,
}: {
  entityId: string;
  fallback: Fallback;
  field: string;
  texts: TranslationFieldMap | null;
}): string | Fallback {
  return texts?.get(entityId)?.get(field) ?? fallback;
}
