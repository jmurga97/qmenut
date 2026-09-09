import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { translations } from "../schema/translations";

import type { DrizzleDb } from "../client";
import type { ResolvedTenant } from "../domain/tenant";
import type { PublicTranslation } from "../models/translation";
import type { BatchItem } from "drizzle-orm/batch";

export const TRANSLATION_ENTITY_TYPES = translations.entityType.enumValues;
export type TranslationEntityType = (typeof TRANSLATION_ENTITY_TYPES)[number];
export type TranslationField = "description" | "name";

interface TenantLanguageIdsInput {
  db: DrizzleDb;
  ids: string[];
  languageCode: string;
  tenant: ResolvedTenant;
}

export async function getTranslationRows({
  db,
  ids,
  languageCode,
  tenant,
}: TenantLanguageIdsInput): Promise<PublicTranslation[]> {
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
    .where(
      and(
        eq(translations.restaurantId, tenant.restaurantId),
        eq(translations.languageCode, languageCode),
        inArray(translations.entityId, ids),
      ),
    )
    .orderBy(asc(translations.entityType), asc(translations.field))
    .all();
}

export interface TranslationUpsert {
  entityId: string;
  entityType: TranslationEntityType;
  field: string;
  languageCode: string;
  value: string;
}

interface UpsertTranslationsInput {
  db: DrizzleDb;
  restaurantId: string;
  rows: TranslationUpsert[];
}

// D1 caps bound parameters per statement; 9 columns per row → keep chunks small.
const UPSERT_CHUNK_SIZE = 8;

export async function upsertTranslations({ db, restaurantId, rows }: UpsertTranslationsInput): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const now = Date.now();
  const chunks = Array.from({ length: Math.ceil(rows.length / UPSERT_CHUNK_SIZE) }, (_, index) =>
    rows.slice(index * UPSERT_CHUNK_SIZE, (index + 1) * UPSERT_CHUNK_SIZE),
  );
  const [firstChunk, ...remainingChunks] = chunks;

  if (!firstChunk) {
    return;
  }

  const statementFor = (chunk: TranslationUpsert[]) =>
    db
      .insert(translations)
      .values(
        chunk.map((row) => ({
          id: crypto.randomUUID(),
          restaurantId,
          entityType: row.entityType,
          entityId: row.entityId,
          languageCode: row.languageCode,
          field: row.field,
          value: row.value,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [translations.entityType, translations.entityId, translations.languageCode, translations.field],
        set: {
          value: sql`excluded.value`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

  await db.batch([statementFor(firstChunk), ...remainingChunks.map((chunk) => statementFor(chunk))]);
}

interface DeleteTranslationsForLanguageInput {
  db: DrizzleDb;
  languageCode: string;
  restaurantId: string;
}

export function deleteTranslationsForLanguageStatement({
  db,
  languageCode,
  restaurantId,
}: DeleteTranslationsForLanguageInput): BatchItem<"sqlite"> {
  return db
    .delete(translations)
    .where(and(eq(translations.restaurantId, restaurantId), eq(translations.languageCode, languageCode)));
}
