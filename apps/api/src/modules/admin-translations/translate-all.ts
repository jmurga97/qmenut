import { TRPCError } from "@trpc/server";
import { collectTranslatableTexts } from "@qmenut/db/repositories/admin-translations.repository";
import { listTranslationsForLanguage, upsertTranslations } from "@qmenut/db/repositories/translations.repository";

import { deeplTranslate } from "./deepl.service";
import { getLanguageCatalogEntry } from "./language-catalog";
import { sanitizeDescription } from "../public-menu/sanitize-description";

import type { TranslatableText } from "@qmenut/db/repositories/admin-translations.repository";
import type { TranslationRow, TranslationUpsert } from "@qmenut/db/repositories/translations.repository";
import type { DrizzleDb } from "@qmenut/db";

const DEEPL_BATCH_SIZE = 50;

interface TranslateAllInput {
  db: DrizzleDb;
  deeplApiKey: string | undefined;
  deeplApiUrl: string;
  languageCode: string;
  onlyMissing: boolean;
  restaurantId: string;
}

export interface TranslateAllResult {
  batches: number;
  skipped: number;
  translated: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function shouldTranslate({ existing, onlyMissing }: { existing: TranslationRow | undefined; onlyMissing: boolean }) {
  if (!existing) {
    return true;
  }

  // Manual translations are only ever touched by an explicit edit, unless the source
  // content changed underneath them (status flips to pending_update in that case).
  if (existing.source === "manual" && existing.status !== "pending_update") {
    return false;
  }

  return onlyMissing ? existing.status !== "ok" : true;
}

export async function translateAll({
  db,
  deeplApiKey,
  deeplApiUrl,
  languageCode,
  onlyMissing,
  restaurantId,
}: TranslateAllInput): Promise<TranslateAllResult> {
  if (!deeplApiKey) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "DeepL API key is not configured" });
  }

  const catalogEntry = getLanguageCatalogEntry(languageCode);

  if (!catalogEntry?.deeplTarget) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `DeepL does not support "${languageCode}" — translate this language manually`,
    });
  }

  // Re-bind as fresh consts: TS doesn't retain narrowing for captured params/properties
  // inside the nested `translateBatches` closure below.
  const apiKey = deeplApiKey;
  const targetLang = catalogEntry.deeplTarget;

  const [texts, existingRows] = await Promise.all([
    collectTranslatableTexts({ db, restaurantId }),
    listTranslationsForLanguage({ db, languageCode, restaurantId }),
  ]);
  const existingByKey = new Map(
    existingRows.map((row) => [`${row.entityType}:${row.entityId}:${row.field}`, row] as const),
  );

  const toTranslate = texts.filter((text) =>
    shouldTranslate({ existing: existingByKey.get(`${text.entityType}:${text.entityId}:${text.field}`), onlyMissing }),
  );
  const nameItems = toTranslate.filter((item) => item.field === "name");
  const descriptionItems = toTranslate.filter((item) => item.field === "description");
  const rows: TranslationUpsert[] = [];
  let batches = 0;

  async function translateBatches(items: TranslatableText[], tagHandling: "html" | undefined) {
    for (const batchItems of chunk(items, DEEPL_BATCH_SIZE)) {
      const outputs = await deeplTranslate({
        apiKey,
        apiUrl: deeplApiUrl,
        texts: batchItems.map((item) => item.text),
        targetLang,
        tagHandling,
      });

      batches += 1;

      batchItems.forEach((item, index) => {
        const value = outputs[index];

        if (value === undefined) {
          return;
        }

        rows.push({
          entityId: item.entityId,
          entityType: item.entityType,
          field: item.field,
          languageCode,
          source: "machine",
          value: item.field === "description" ? sanitizeDescription(value) : value,
        });
      });
    }
  }

  await translateBatches(nameItems, undefined);
  await translateBatches(descriptionItems, "html");

  await upsertTranslations({ db, restaurantId, rows });

  return {
    batches,
    skipped: texts.length - toTranslate.length,
    translated: rows.length,
  };
}
