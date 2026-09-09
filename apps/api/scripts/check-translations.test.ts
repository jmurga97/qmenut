import { readdirSync, readFileSync } from "node:fs";

import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { translateAll } from "../src/modules/admin-translations/translate-all";

import type { DrizzleDb } from "@qmenut/db/client";

// On macOS, use a current SQLite library for Drizzle table-renaming migrations.
if (process.env.SQLITE_LIBRARY_PATH) Database.setCustomSQLite(process.env.SQLITE_LIBRARY_PATH);

test("retranslates only branch content, clears removed descriptions, and sends Spanish source text", async () => {
  const sqlite = new Database(":memory:");
  const apiRoot = new URL("../", import.meta.url);
  for (const file of readdirSync(new URL("migrations/", apiRoot))
    .filter((name) => name.endsWith(".sql"))
    .toSorted((a, b) => a.localeCompare(b))) {
    for (const statement of readFileSync(new URL(`migrations/${file}`, apiRoot), "utf8").split(
      "--> statement-breakpoint",
    )) {
      sqlite.run(statement);
    }
  }
  sqlite.run(readFileSync(new URL("seed/seed-public-menu.sql", apiRoot), "utf8"));
  sqlite.run(`
    INSERT INTO branches (id, restaurant_id, name) VALUES ('sibling', 'rest_tapas', 'Other branch');
    INSERT INTO categories (id, restaurant_id, branch_id, name) VALUES ('other_category', 'rest_tapas', 'sibling', 'Sibling only');
    INSERT INTO translations (id, restaurant_id, entity_type, entity_id, language_code, field, value)
      VALUES ('other_translation', 'rest_tapas', 'category', 'other_category', 'en', 'name', 'Keep sibling');
    UPDATE categories SET description = NULL WHERE id = 'cat_tapas_tapas';
  `);
  const db = Object.assign(drizzle(sqlite), {
    batch: async (statements: { run: () => unknown }[]) => statements.map((statement) => statement.run()),
  }) as unknown as DrizzleDb;
  const originalFetch = fetch;
  const requests: { source_lang: string; target_lang: string; text: string[]; tag_handling?: string }[] = [];
  try {
    globalThis.fetch = (async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      requests.push(body);
      return Response.json({ translations: body.text.map((text: string) => ({ text: `Translated ${text}` })) });
    }) as typeof fetch;
    const result = await translateAll({
      branchId: "branch_tapas",
      db,
      deeplApiKey: "test",
      deeplApiUrl: "https://translator.invalid",
      languageCode: "en",
      restaurantId: "rest_tapas",
    });
    expect(result.translated).toBeGreaterThan(0);
    expect(requests.every((request) => request.source_lang === "ES" && request.target_lang === "EN-GB")).toBe(true);
    expect(requests.flatMap((request) => request.text)).not.toContain("Sibling only");
    expect(requests.flatMap((request) => request.text)).not.toContain("");
    expect(requests.some((request) => request.tag_handling === "html")).toBe(true);
    expect(sqlite.query("SELECT value FROM translations WHERE id = 'other_translation'").get()).toEqual({
      value: "Keep sibling",
    });
    expect(
      sqlite
        .query(
          "SELECT value FROM translations WHERE entity_id = 'cat_tapas_tapas' AND field = 'description' AND language_code = 'en'",
        )
        .get(),
    ).toEqual({ value: "" });
    expect(
      sqlite
        .query(
          "SELECT value FROM translations WHERE entity_id = 'dish_tapas_croquetas' AND field = 'name' AND language_code = 'en'",
        )
        .get(),
    ).toEqual({ value: "Translated Croquetas de jamón" });
  } finally {
    globalThis.fetch = originalFetch;
    sqlite.close();
  }
});
