import {
  addRestaurantLanguage,
  getRestaurantLanguageInfo,
  removeRestaurantLanguageStatement,
} from "@qmenut/db/repositories/restaurant-languages.repository";
import { deleteTranslationsForLanguageStatement } from "@qmenut/db/repositories/translations.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getLanguageCatalogEntry, LANGUAGE_CATALOG } from "./language-catalog";
import { translateAll } from "./translate-all";
import { bumpPublicContentVersionForRestaurant } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";

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
  branchId: z.string().trim().min(1),
  languageCode: languageCodeSchema,
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

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { added: true as const };
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
  translateAll: tenantProcedure.input(translateAllInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "languages.write");
    await assertTranslatableLanguage({
      db: ctx.db,
      languageCode: input.languageCode,
      mustExist: true,
      restaurantId: ctx.tenant.restaurantId,
    });
    await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });
    try {
      return await translateAll({
        branchId: input.branchId,
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
