import { getRestaurantLanguageInfo } from "@qmenut/db/repositories/restaurant-languages.repository";
import { upsertTranslations } from "@qmenut/db/repositories/translations.repository";
import { TRPCError } from "@trpc/server";

import { deeplTranslate } from "./deepl.service";
import { getLanguageCatalogEntry } from "./language-catalog";
import { getTranslationContent, languageTexts } from "./translation-content";
import { sanitizeDescription } from "../public-menu/sanitize-description";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { TranslatableText } from "@qmenut/db/repositories/admin-translations.repository";

const DEEPL_BATCH_SIZE = 50;

function* translationBatches(items: TranslatableText[]) {
  let batch: TranslatableText[] = [];
  let bytes = 0;
  for (const item of items) {
    const size = new TextEncoder().encode(JSON.stringify(item.text)).length + 1;
    // Leave space for request metadata inside DeepL's 128 KiB body limit.
    if (batch.length === DEEPL_BATCH_SIZE || bytes + size > 120_000) {
      yield batch;
      batch = [];
      bytes = 0;
    }
    batch.push(item);
    bytes += size;
  }
  if (batch.length > 0) yield batch;
}

function translatedRow({ item, languageCode, value }: { item: TranslatableText; languageCode: string; value: string }) {
  const clean = item.field === "description" ? sanitizeDescription(value) : value.trim();
  if (item.text.trim() && !clean.trim())
    throw new TRPCError({ code: "BAD_GATEWAY", message: "El proveedor devolvió una traducción vacía" });
  if (item.field === "comboDescription" && clean.length > 2000)
    throw new TRPCError({ code: "BAD_GATEWAY", message: "El proveedor devolvió una descripción demasiado larga" });
  return {
    entityId: item.entityId,
    entityType: item.entityType,
    field: item.field,
    languageCode,
    sourceText: item.text,
    value: clean,
  };
}

interface TranslateAllInput {
  branchId?: string;
  env?: RuntimeEnv;
  overwrite?: boolean;
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
  env,
  overwrite = true,
}: TranslateAllInput): Promise<TranslateAllResult> {
  const content = await getTranslationContent({ branchId, db, env, restaurantId });
  const texts = overwrite
    ? content.texts
    : languageTexts(content, languageCode).filter(
        (item) => !item.isManual && (!item.complete || item.sourceText !== item.text),
      );
  if (texts.length === 0) return { batches: 0, translated: 0 };
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

  const info = await getRestaurantLanguageInfo({ db, restaurantId });
  const sourceLang = (info?.defaultLanguageCode ?? "es").split("-", 1)[0].toUpperCase();
  let batches = 0;
  let translated = 0;

  async function translateBatches(items: TranslatableText[], tagHandling?: "html") {
    for (const batchItems of translationBatches(items)) {
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
        preserveManual: !overwrite,
        rows: batchItems.map((item, index) => translatedRow({ item, languageCode, value: outputs[index] })),
      });
      translated += batchItems.length;
    }
  }

  await upsertTranslations({
    db,
    restaurantId,
    preserveManual: !overwrite,
    rows: texts.filter((item) => !item.text.trim()).map((item) => translatedRow({ item, languageCode, value: "" })),
  });
  await translateBatches(texts.filter((item) => item.field !== "description" && item.text.trim()));
  await translateBatches(
    texts.filter((item) => item.field === "description" && item.text.trim()),
    "html",
  );

  return { batches, translated };
}
