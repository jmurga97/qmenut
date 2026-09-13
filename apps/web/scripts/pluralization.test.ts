import { describe, expect, test } from "bun:test";

import { BUNDLED_LOCALES, createI18nInstance } from "../src/lib/i18n/create-i18n";

const pluralKeys = [
  "menu.dishCount",
  "contact.page.locationSectionLabel",
  "contact.page.mapAriaLabel",
  "contact.reviews.ratingCount",
  "loyalty.intro.body",
  "loyalty.signup.pitch",
  "loyalty.card.gridLabel",
  "loyalty.reward.stamps",
  "loyalty.reward.remaining",
] as const;

const counts = [0, 1, 2, 3, 4, 5, 11, 21, 22, 25, 101, 1.5, 1_000_000];

function getResourceValue(resource: unknown, path: string): unknown {
  let value = resource;
  for (const key of path.split(".")) {
    if (value === null || typeof value !== "object") return;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

describe("bundled plural resources", () => {
  for (const locale of BUNDLED_LOCALES) {
    test(`${locale} has every Intl.PluralRules category and resolves through i18next`, () => {
      const i18n = createI18nInstance(locale);
      const resource: unknown = i18n.getResourceBundle(locale, "translation");
      const englishResource: unknown = createI18nInstance("en").getResourceBundle("en", "translation");
      const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;

      for (const key of pluralKeys) {
        categories.forEach((category) => {
          const resourceKey = `${key}_${category}`;
          expect(getResourceValue(resource, resourceKey)).toEqual(expect.any(String));
          if (locale !== "en")
            expect(getResourceValue(resource, resourceKey)).not.toBe(getResourceValue(englishResource, resourceKey));
        });

        counts.forEach((count) => {
          const category = new Intl.PluralRules(locale).select(count);
          const options = { count, filled: count, reward: "Reward", total: count };
          expect(i18n.t(key, options)).toBe(i18n.t(`${key}_${category}`, options));
          expect(i18n.t(key, options)).not.toBe(key);
        });
      }
    });
  }

  test("keeps Russian and Ukrainian dish forms distinct", () => {
    for (const [locale, forms] of Object.entries({
      ru: ["2 блюда", "5 блюд", "21 блюдо"],
      uk: ["2 страви", "5 страв", "21 страва"],
    })) {
      const i18n = createI18nInstance(locale);
      expect(i18n.t("menu.dishCount", { count: 2 })).toBe(forms[0]);
      expect(i18n.t("menu.dishCount", { count: 5 })).toBe(forms[1]);
      expect(i18n.t("menu.dishCount", { count: 21 })).toBe(forms[2]);
    }
  });
});
