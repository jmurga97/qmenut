import {
  addRestaurantLanguage,
  getRestaurantLanguageInfo,
  removeRestaurantLanguageStatement,
} from "@qmenut/db/repositories/restaurant-languages.repository";
import {
  deleteTranslationsForLanguageStatement,
  TRANSLATION_ENTITY_TYPES,
  upsertTranslations,
} from "@qmenut/db/repositories/translations.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getLanguageCatalogEntry, LANGUAGE_CATALOG } from "./language-catalog";
import { translateAll } from "./translate-all";
import { getTranslationContent, languageTexts, translationKey } from "./translation-content";
import { bumpPublicContentVersionForRestaurant } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";
import { sanitizeDescription } from "../public-menu/sanitize-description";

import type { DrizzleDb } from "@qmenut/db/client";

const languageCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i);

const catalogLanguageCodeSchema = languageCodeSchema.refine((code) => Boolean(getLanguageCatalogEntry(code)), {
  message: "Código de idioma no compatible",
});

const addLanguageInputSchema = z.object({
  languageCode: catalogLanguageCodeSchema,
});

const removeLanguageInputSchema = z.object({
  languageCode: languageCodeSchema,
});

const translateAllInputSchema = z.object({
  branchId: z.string().trim().min(1).optional(),
  languageCode: languageCodeSchema,
  overwrite: z.boolean().default(false),
});

const translationListSchema = z.object({
  branchId: z.string().trim().min(1),
  languageCode: languageCodeSchema,
});
const translationRowSchema = z.object({
  entityType: z.enum(TRANSLATION_ENTITY_TYPES),
  entityId: z.string().min(1),
  field: z.enum(["name", "description", "tagline"]),
  sourceText: z.string().max(10_000),
  value: z.string().trim().max(10_000),
});
const translationSaveSchema = translationListSchema.extend({
  rows: z.array(translationRowSchema).min(1).max(100),
});

async function assertTranslatableLanguage({
  db,
  languageCode,
  mustExist,
  restaurantId,
}: {
  db: DrizzleDb;
  languageCode: string;
  mustExist: boolean;
  restaurantId: string;
}) {
  const info = await getRestaurantLanguageInfo({ db, restaurantId });

  if (languageCode === info?.defaultLanguageCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "El idioma predeterminado contiene el contenido base y no se puede traducir",
    });
  }

  if (mustExist && !info?.languages.some((language) => language.languageCode === languageCode)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "El idioma no está habilitado para este restaurante" });
  }
}

const languagesRouter = router({
  catalog: tenantProcedure.query(() =>
    LANGUAGE_CATALOG.map((entry) => ({
      code: entry.code,
      label: entry.label,
      translatable: Boolean(entry.deeplTarget),
    })),
  ),
  list: tenantProcedure.query(async ({ ctx }) => {
    const info = await getRestaurantLanguageInfo({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });
    const content = await getTranslationContent({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId });
    return {
      defaultLanguageCode: info?.defaultLanguageCode ?? null,
      languages: (info?.languages ?? []).map((language) => {
        const items = languageTexts(content, language.languageCode);
        const missing = language.isDefault ? 0 : items.filter((item) => !item.complete).length;
        return { ...language, missing, total: items.filter((item) => item.text.trim()).length, ready: missing === 0 };
      }),
    };
  }),
  add: tenantProcedure.input(addLanguageInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    await assertTranslatableLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      mustExist: false,
      restaurantId: ctx.tenant.restaurantId,
    });
    await addRestaurantLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      restaurantId: ctx.tenant.restaurantId,
    });

    let preparationError: string | null = null;
    try {
      await translateAll({
        db: ctx.db,
        env: ctx.env,
        restaurantId: ctx.tenant.restaurantId,
        languageCode: input.languageCode,
        deeplApiKey: ctx.env.DEEPL_API_KEY,
        deeplApiUrl: ctx.env.DEEPL_API_URL,
        overwrite: false,
      });
    } catch (error) {
      preparationError = error instanceof Error ? error.message : "No se pudo preparar el idioma";
    }

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { added: true as const, preparationError };
  }),
  remove: tenantProcedure.input(removeLanguageInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    await assertTranslatableLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      mustExist: true,
      restaurantId: ctx.tenant.restaurantId,
    });
    await ctx.db.batch([
      removeRestaurantLanguageStatement({
        db: ctx.db,
        languageCode: input.languageCode,
        restaurantId: ctx.tenant.restaurantId,
      }),
      deleteTranslationsForLanguageStatement({
        db: ctx.db,
        languageCode: input.languageCode,
        restaurantId: ctx.tenant.restaurantId,
      }),
    ]);

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { languageCode: input.languageCode };
  }),
});

const translationsRouter = router({
  list: tenantProcedure.input(translationListSchema).query(async ({ ctx, input }) => {
    await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });
    await assertTranslatableLanguage({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      languageCode: input.languageCode,
      mustExist: true,
    });
    return languageTexts(
      await getTranslationContent({
        db: ctx.db,
        env: ctx.env,
        restaurantId: ctx.tenant.restaurantId,
        branchId: input.branchId,
      }),
      input.languageCode,
    );
  }),
  save: tenantProcedure.input(translationSaveSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });
    await assertTranslatableLanguage({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      languageCode: input.languageCode,
      mustExist: true,
    });
    const content = await getTranslationContent({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    const sources = new Map(content.texts.map((item) => [translationKey(item), item]));
    const rows = input.rows.map((row) => {
      const source = sources.get(translationKey(row));
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Texto no encontrado en esta sucursal" });
      if (source.text !== row.sourceText)
        throw new TRPCError({
          code: "CONFLICT",
          message: "El texto original ha cambiado. Recarga antes de guardar la traducción.",
        });
      const value = row.field === "description" ? sanitizeDescription(row.value) : row.value;
      if (source.text.trim() && !value.trim())
        throw new TRPCError({ code: "BAD_REQUEST", message: "La traducción no puede estar vacía" });
      if ((row.field === "name" && value.length > 200) || (row.field === "tagline" && value.length > 120))
        throw new TRPCError({ code: "BAD_REQUEST", message: "La traducción supera la longitud permitida" });
      return { ...row, value, languageCode: input.languageCode, isManual: true };
    });
    await upsertTranslations({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, rows });
    await bumpPublicContentVersionForRestaurant({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId });
    return { saved: rows.length };
  }),
  translateAll: tenantProcedure.input(translateAllInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    await assertTranslatableLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      mustExist: true,
      restaurantId: ctx.tenant.restaurantId,
    });
    if (input.branchId)
      await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });
    try {
      return await translateAll({
        branchId: input.branchId,
        env: ctx.env,
        overwrite: input.overwrite,
        db: ctx.db,
        deeplApiKey: ctx.env.DEEPL_API_KEY,
        deeplApiUrl: ctx.env.DEEPL_API_URL,
        languageCode: input.languageCode,
        restaurantId: ctx.tenant.restaurantId,
      });
    } finally {
      await bumpPublicContentVersionForRestaurant({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId });
    }
  }),
});

export const adminTranslationsRouter = router({
  languages: languagesRouter,
  translations: translationsRouter,
});
