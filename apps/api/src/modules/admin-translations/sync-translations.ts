import { getRestaurantLanguageInfo } from "@qmenut/db/repositories/restaurant-languages.repository";

import { translateAll } from "./translate-all";
import { bumpPublicContentVersionForRestaurant } from "../../lib/public-content-version";

import type { TranslationContentInput } from "./translation-content";

const SOURCE_MUTATIONS = new Set([
  "admin.menu.categories.create",
  "admin.menu.categories.update",
  "admin.menu.categories.remove",
  "admin.menu.dishes.create",
  "admin.menu.dishes.update",
  "admin.menu.dishes.remove",
  "admin.menu.dishes.saveRelations",
  "admin.menu.taxonomy.createIngredient",
  "admin.promotions.create",
  "admin.promotions.update",
  "admin.promotions.remove",
  "admin.theme.save",
  "admin.loyalty.createReward",
  "admin.loyalty.updateReward",
  "admin.loyalty.deleteReward",
]);

export async function syncTranslationsAfterSave({
  path,
  db,
  env,
  restaurantId,
}: TranslationContentInput & { path: string }) {
  if (!env || !SOURCE_MUTATIONS.has(path)) return;
  try {
    const info = await getRestaurantLanguageInfo({ db, restaurantId });
    const targets = info?.languages.filter((language) => !language.isDefault) ?? [];
    await Promise.all(
      targets.map(async (language) => {
        try {
          await translateAll({
            db,
            env,
            restaurantId,
            languageCode: language.languageCode,
            overwrite: false,
            deeplApiKey: env.DEEPL_API_KEY,
            deeplApiUrl: env.DEEPL_API_URL,
          });
        } catch (error) {
          // Source saves succeed independently. Incomplete languages stay out of the public selector;
          // the language panel exposes the missing texts and lets the operator retry or edit them.
          console.error(`No se pudo actualizar el idioma ${language.languageCode}`, error);
        }
      }),
    );
  } catch (error) {
    console.error("No se pudieron comprobar las traducciones después de guardar", error);
  } finally {
    await bumpPublicContentVersionForRestaurant({ db, env, restaurantId });
  }
}
