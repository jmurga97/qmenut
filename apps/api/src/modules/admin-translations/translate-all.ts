import { collectTranslatableTexts } from "@qmenut/db/repositories/admin-translations.repository";
import { getRestaurantLanguageInfo } from "@qmenut/db/repositories/restaurant-languages.repository";
import { upsertTranslations } from "@qmenut/db/repositories/translations.repository";
import { TRPCError } from "@trpc/server";

import { deeplTranslate } from "./deepl.service";
import { getLanguageCatalogEntry } from "./language-catalog";
import { sanitizeDescription } from "../public-menu/sanitize-description";

import type { DrizzleDb } from "@qmenut/db/client";
import type { TranslatableText } from "@qmenut/db/repositories/admin-translations.repository";

const DEEPL_BATCH_SIZE = 50;

interface TranslateAllInput {
  branchId: string;
  db: DrizzleDb;
  deeplApiKey: string | undefined;
  deeplApiUrl: string;
  languageCode: string;
  restaurantId: string;
}

export interface TranslateAllResult {
  batches: number;
  translated: number;
}

export async function translateAll({
  branchId,
  db,
  deeplApiKey,
  deeplApiUrl,
  languageCode,
  restaurantId,
}: TranslateAllInput): Promise<TranslateAllResult> {
  if (!deeplApiKey) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La clave de API de DeepL no está configurada" });
  }

  const catalogEntry = getLanguageCatalogEntry(languageCode);

  if (!catalogEntry?.deeplTarget) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `DeepL no admite "${languageCode}"`,
    });
  }

  // Re-bind as fresh consts: TS doesn't retain narrowing for captured params/properties
  // inside the nested `translateBatches` closure below.
  const apiKey = deeplApiKey;
  const targetLang = catalogEntry.deeplTarget;

  const texts = await collectTranslatableTexts({ branchId, db, restaurantId });
  const info = await getRestaurantLanguageInfo({ db, restaurantId });
  const sourceLang = (info?.defaultLanguageCode ?? "es").split("-", 1)[0].toUpperCase();
  const nameItems = texts.filter((item) => item.field === "name" && item.text.trim());
  const descriptionItems = texts.filter((item) => item.field === "description" && item.text.trim());
  let batches = 0;
  let translated = 0;

  async function translateBatches(items: TranslatableText[], tagHandling: "html" | undefined) {
    for (let index = 0; index < items.length; index += DEEPL_BATCH_SIZE) {
      const batchItems = items.slice(index, index + DEEPL_BATCH_SIZE);
      const outputs = await deeplTranslate({
        apiKey,
        apiUrl: deeplApiUrl,
        texts: batchItems.map((item) => item.text),
        sourceLang,
        targetLang,
        tagHandling,
      });

      batches += 1;
      // Flush per batch: D1 has no interactive transactions, so a later batch failing must
      // not discard translations we already paid DeepL for. Upserts are idempotent on
      // ux_translations_lookup, so a retry is safe.
      await upsertTranslations({
        db,
        restaurantId,
        rows: batchItems.map((item, index) => ({
          entityId: item.entityId,
          entityType: item.entityType,
          field: item.field,
          languageCode,
          value: item.field === "description" ? sanitizeDescription(outputs[index]) : outputs[index],
        })),
      });
      translated += batchItems.length;
    }
  }

  await upsertTranslations({
    db,
    restaurantId,
    rows: texts
      .filter((item) => !item.text.trim())
      .map((item) => ({
        entityId: item.entityId,
        entityType: item.entityType,
        field: item.field,
        languageCode,
        value: "",
      })),
  });
  await translateBatches(nameItems, undefined);
  await translateBatches(descriptionItems, "html");

  return { batches, translated };
}
