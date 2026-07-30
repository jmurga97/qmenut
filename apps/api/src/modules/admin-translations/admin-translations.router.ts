import { entityBelongsToRestaurant } from "@qmenut/db/repositories/admin-translations.repository";
import {
  addRestaurantLanguage,
  getRestaurantLanguageInfo,
  removeRestaurantLanguageStatement,
  setRestaurantLanguageActive,
} from "@qmenut/db/repositories/restaurant-languages.repository";
import {
  deleteTranslationsForLanguageStatement,
  TRANSLATABLE_FIELDS,
  TRANSLATION_ENTITY_TYPES,
  upsertTranslations,
} from "@qmenut/db/repositories/translations.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getLanguageCatalogEntry, LANGUAGE_CATALOG } from "./language-catalog";
import { listTranslations } from "./list-translations";
import { translateAll } from "./translate-all";
import { bumpPublicContentVersionForRestaurant } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";
import { sanitizeDescription } from "../public-menu/sanitize-description";

import type { DrizzleDb } from "@qmenut/db/client";
import type { BatchItem } from "drizzle-orm/batch";

const languageCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,3}(-[a-z]{2,4})?$/i);

const catalogLanguageCodeSchema = languageCodeSchema.refine((code) => getLanguageCatalogEntry(code) !== undefined, {
  message: "Código de idioma no compatible",
});

const addLanguageInputSchema = z.object({
  autoTranslate: z.boolean().optional(),
  languageCode: catalogLanguageCodeSchema,
});

const setLanguageActiveInputSchema = z.object({
  isActive: z.boolean(),
  languageCode: languageCodeSchema,
});

const removeLanguageInputSchema = z.object({
  deleteTranslations: z.boolean().optional(),
  languageCode: languageCodeSchema,
});

const translateAllInputSchema = z.object({
  languageCode: languageCodeSchema,
  onlyMissing: z.boolean().optional().default(true),
});

const listTranslationsInputSchema = z.object({
  branchId: z.string().trim().min(1),
  languageCode: languageCodeSchema,
});

const entityTypeSchema = z.enum(TRANSLATION_ENTITY_TYPES);
const fieldSchema = z.enum(["name", "description"]);

const updateTranslationInputSchema = z
  .object({
    entityId: z.string().trim().min(1),
    entityType: entityTypeSchema,
    field: fieldSchema,
    languageCode: languageCodeSchema,
    value: z.string(),
  })
  .refine((input) => (TRANSLATABLE_FIELDS[input.entityType] as readonly string[]).includes(input.field), {
    message: "Este campo no se puede traducir para este tipo de entidad",
    path: ["field"],
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
      deeplSupported: entry.deeplTarget !== null,
      label: entry.label,
    })),
  ),
  list: tenantProcedure.query(async ({ ctx }) => {
    const info = await getRestaurantLanguageInfo({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });

    return info ?? { defaultLanguageCode: null, languages: [] };
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

    let translation: "failed" | "ok" | "skipped" | "unavailable" | "unsupported" = "skipped";
    const catalogEntry = getLanguageCatalogEntry(input.languageCode);

    if (input.autoTranslate && !catalogEntry?.deeplTarget) {
      translation = "unsupported";
    } else if (input.autoTranslate && !ctx.env.DEEPL_API_KEY) {
      translation = "unavailable";
    } else if (input.autoTranslate) {
      try {
        await translateAll({
          db: ctx.db,
          deeplApiKey: ctx.env.DEEPL_API_KEY,
          deeplApiUrl: ctx.env.DEEPL_API_URL,
          languageCode: input.languageCode,
          onlyMissing: true,
          restaurantId: ctx.tenant.restaurantId,
        });
        translation = "ok";
      } catch (error) {
        console.error(`No se pudo traducir el idioma añadido ${input.languageCode}`, error);
        translation = "failed";
      }
    }

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { added: true as const, translation };
  }),
  setActive: tenantProcedure.input(setLanguageActiveInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    await setRestaurantLanguageActive({
      db: ctx.db,
      isActive: input.isActive,
      languageCode: input.languageCode,
      restaurantId: ctx.tenant.restaurantId,
    });

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { languageCode: input.languageCode };
  }),
  remove: tenantProcedure.input(removeLanguageInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
      removeRestaurantLanguageStatement({
        db: ctx.db,
        languageCode: input.languageCode,
        restaurantId: ctx.tenant.restaurantId,
      }),
    ];

    if (input.deleteTranslations) {
      statements.push(
        deleteTranslationsForLanguageStatement({
          db: ctx.db,
          languageCode: input.languageCode,
          restaurantId: ctx.tenant.restaurantId,
        }),
      );
    }

    await ctx.db.batch(statements);

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { languageCode: input.languageCode };
  }),
});

const translationsRouter = router({
  translateAll: tenantProcedure.input(translateAllInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    await assertTranslatableLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      mustExist: true,
      restaurantId: ctx.tenant.restaurantId,
    });
    const result = await translateAll({
      db: ctx.db,
      deeplApiKey: ctx.env.DEEPL_API_KEY,
      deeplApiUrl: ctx.env.DEEPL_API_URL,
      languageCode: input.languageCode,
      onlyMissing: input.onlyMissing,
      restaurantId: ctx.tenant.restaurantId,
    });

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return result;
  }),
  list: tenantProcedure.input(listTranslationsInputSchema).query(async ({ ctx, input }) => {
    await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });

    return listTranslations({
      branchId: input.branchId,
      db: ctx.db,
      languageCode: input.languageCode,
      restaurantId: ctx.tenant.restaurantId,
    });
  }),
  update: tenantProcedure.input(updateTranslationInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    await assertTranslatableLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      mustExist: true,
      restaurantId: ctx.tenant.restaurantId,
    });

    const owned = await entityBelongsToRestaurant({
      db: ctx.db,
      entityId: input.entityId,
      entityType: input.entityType,
      restaurantId: ctx.tenant.restaurantId,
    });

    if (!owned) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Entidad no encontrada" });
    }

    const value = input.field === "description" ? sanitizeDescription(input.value) : input.value;

    await upsertTranslations({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      rows: [
        {
          entityId: input.entityId,
          entityType: input.entityType,
          field: input.field,
          languageCode: input.languageCode,
          source: "manual",
          value,
        },
      ],
    });

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { entityId: input.entityId, field: input.field, languageCode: input.languageCode };
  }),
});

export const adminTranslationsRouter = router({
  languages: languagesRouter,
  translations: translationsRouter,
});
