import { describe, expect, test } from "bun:test";

import { matchSupportedLocale } from "../src/lib/i18n/locale-matcher";

describe("matchSupportedLocale", () => {
  test("canonicalizes comparisons while returning the supported code", () => {
    expect(matchSupportedLocale("EN-gb", ["en-GB"])).toBe("en-GB");
  });

  test("tries every fallback for one preference before the next preference", () => {
    expect(matchSupportedLocale(["fr-CA", "en-US"], ["en-US", "fr"])).toBe("fr");
  });

  test("keeps Valencian separate from plain Catalan", () => {
    expect(matchSupportedLocale("ca-ES-valencia", ["ca", "ca-valencia"])).toBe("ca-valencia");
    expect(matchSupportedLocale("ca", ["ca", "ca-valencia"])).toBe("ca");
    expect(matchSupportedLocale("ca", ["ca-valencia"])).toBeUndefined();
  });

  test("does not depend on the optional Locale Info variants getter", () => {
    const localePrototype = Intl.Locale.prototype as Intl.Locale & { variants?: string };
    const variantsDescriptor = Object.getOwnPropertyDescriptor(localePrototype, "variants");

    try {
      Object.defineProperty(localePrototype, "variants", { configurable: true, value: undefined });
      expect(matchSupportedLocale("ca-ES-valencia", ["ca-valencia"])).toBe("ca-valencia");
    } finally {
      if (variantsDescriptor) {
        Object.defineProperty(localePrototype, "variants", variantsDescriptor);
      } else {
        delete localePrototype.variants;
      }
    }
  });

  test("falls back through script and region subtags", () => {
    expect(matchSupportedLocale("zh-Hant-TW", ["zh-Hant", "zh"])).toBe("zh-Hant");
    expect(matchSupportedLocale("zh-Hant-TW", ["zh"])).toBe("zh");
  });

  test("skips invalid preferences and supported codes", () => {
    expect(matchSupportedLocale(["en_US", "de-DE"], ["en_US", "de"])).toBe("de");
    expect(matchSupportedLocale("en_US", ["en_US"])).toBeUndefined();
  });
});
