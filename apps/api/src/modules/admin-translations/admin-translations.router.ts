import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { entityBelongsToRestaurant } from "@qmenut/db/repositories/admin-translations.repository";
import {
  addRestaurantLanguage,
  getRestaurantLanguageInfo,
  removeRestaurantLanguage,
  setRestaurantLanguageActive,
} from "@qmenut/db/repositories/restaurant-languages.repository";
import { deleteTranslationsForLanguage, upsertTranslations } from "@qmenut/db/repositories/translations.repository";

import { LANGUAGE_CATALOG } from "./language-catalog";
import { listTranslations } from "./list-translations";
import { translateAll } from "./translate-all";
import { sanitizeDescription } from "../public-menu/sanitize-description";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requireRole } from "../admin-tenant/require-role";
import { router, tenantProcedure } from "../../trpc/trpc";

const WRITE_ROLES = ["owner", "admin"] as const;

const languageCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,3}(-[a-z]{2,4})?$/i);

const addLanguageInputSchema = z.object({
  autoTranslate: z.boolean().optional(),
  languageCode: languageCodeSchema,
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

const entityTypeSchema = z.enum(["category", "dish", "ingredient", "variant_group", "variant_option"]);
const fieldSchema = z.enum(["name", "description"]);

const updateTranslationInputSchema = z.object({
  entityId: z.string().trim().min(1),
  entityType: entityTypeSchema,
  field: fieldSchema,
  languageCode: languageCodeSchema,
  value: z.string(),
});

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
    requireRole(ctx.tenant, WRITE_ROLES);
    await addRestaurantLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      restaurantId: ctx.tenant.restaurantId,
    });

    if (!input.autoTranslate) {
      return { added: true as const, translated: undefined };
    }

    const result = await translateAll({
      db: ctx.db,
      deeplApiKey: ctx.env.DEEPL_API_KEY,
      deeplApiUrl: ctx.env.DEEPL_API_URL,
      languageCode: input.languageCode,
      onlyMissing: true,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { added: true as const, translated: result };
  }),
  setActive: tenantProcedure.input(setLanguageActiveInputSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    await setRestaurantLanguageActive({
      db: ctx.db,
      isActive: input.isActive,
      languageCode: input.languageCode,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { languageCode: input.languageCode };
  }),
  remove: tenantProcedure.input(removeLanguageInputSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    await removeRestaurantLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      restaurantId: ctx.tenant.restaurantId,
    });

    if (input.deleteTranslations) {
      await deleteTranslationsForLanguage({
        db: ctx.db,
        languageCode: input.languageCode,
        restaurantId: ctx.tenant.restaurantId,
      });
    }

    return { languageCode: input.languageCode };
  }),
});

const translationsRouter = router({
  translateAll: tenantProcedure.input(translateAllInputSchema).mutation(({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    return translateAll({
      db: ctx.db,
      deeplApiKey: ctx.env.DEEPL_API_KEY,
      deeplApiUrl: ctx.env.DEEPL_API_URL,
      languageCode: input.languageCode,
      onlyMissing: input.onlyMissing,
      restaurantId: ctx.tenant.restaurantId,
    });
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
    requireRole(ctx.tenant, WRITE_ROLES);

    const owned = await entityBelongsToRestaurant({
      db: ctx.db,
      entityId: input.entityId,
      entityType: input.entityType,
      restaurantId: ctx.tenant.restaurantId,
    });

    if (!owned) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Entity not found" });
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

    return { entityId: input.entityId, field: input.field, languageCode: input.languageCode };
  }),
});

export const adminTranslationsRouter = router({
  languages: languagesRouter,
  translations: translationsRouter,
});
