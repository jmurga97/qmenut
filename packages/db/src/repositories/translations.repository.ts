import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { translationLocks, translations } from "../schema/translations";

import type { DrizzleDb } from "../client";
import type { ResolvedTenant } from "../domain/tenant";
import type { PublicTranslation } from "../models/translation";
import type { BatchItem } from "drizzle-orm/batch";

export const TRANSLATION_ENTITY_TYPES = translations.entityType.enumValues;
export type TranslationEntityType = (typeof TRANSLATION_ENTITY_TYPES)[number];
export type TranslationField = "comboDescription" | "description" | "name" | "tagline";

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
  sourceText?: string | null;
  isManual?: boolean;
}

interface UpsertTranslationsInput {
  db: DrizzleDb;
  restaurantId: string;
  rows: TranslationUpsert[];
  preserveManual?: boolean;
}

// D1 caps bound parameters per statement; 9 columns per row → keep chunks small.
const UPSERT_CHUNK_SIZE = 8;

export async function upsertTranslations({
  db,
  restaurantId,
  rows,
  preserveManual = false,
}: UpsertTranslationsInput): Promise<void> {
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
          sourceText: row.sourceText,
          isManual: row.isManual ?? false,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [translations.entityType, translations.entityId, translations.languageCode, translations.field],
        setWhere: preserveManual ? eq(translations.isManual, false) : undefined,
        set: {
          value: sql`excluded.value`,
          sourceText: sql`excluded.source_text`,
          isManual: sql`excluded.is_manual`,
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

export function listTranslationLocks({ db, restaurantId }: { db: DrizzleDb; restaurantId: string }) {
  return db
    .select({
      entityType: translationLocks.entityType,
      entityId: translationLocks.entityId,
      field: translationLocks.field,
    })
    .from(translationLocks)
    .where(eq(translationLocks.restaurantId, restaurantId))
    .all();
}

interface SetTranslationLockInput {
  db: DrizzleDb;
  restaurantId: string;
  entityType: TranslationEntityType;
  entityId: string;
  field: string;
  locked: boolean;
}

/** Locking also drops the stored translations, so every view falls back to the base text. */
export async function setTranslationLock({
  db,
  restaurantId,
  entityType,
  entityId,
  field,
  locked,
}: SetTranslationLockInput): Promise<void> {
  const key = and(
    eq(translationLocks.restaurantId, restaurantId),
    eq(translationLocks.entityType, entityType),
    eq(translationLocks.entityId, entityId),
    eq(translationLocks.field, field),
  );
  if (!locked) {
    await db.delete(translationLocks).where(key);
    return;
  }
  const stored = and(
    eq(translations.restaurantId, restaurantId),
    eq(translations.entityType, entityType),
    eq(translations.entityId, entityId),
    eq(translations.field, field),
  );
  await db.batch([
    db.insert(translationLocks).values({ restaurantId, entityType, entityId, field }).onConflictDoNothing(),
    db.delete(translations).where(stored),
  ]);
}
