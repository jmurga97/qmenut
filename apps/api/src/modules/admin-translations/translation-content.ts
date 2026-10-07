import { listBranches } from "@qmenut/db/repositories/admin-branches.repository";
import { collectTranslatableTexts } from "@qmenut/db/repositories/admin-translations.repository";
import { listTranslationLocks } from "@qmenut/db/repositories/translations.repository";
import { translations } from "@qmenut/db/schema/translations";
import { eq } from "drizzle-orm";

import { getTheme } from "../../lib/theme/theme-worker-client";

import type { RuntimeEnv } from "../../config/env/schema";
import type { DrizzleDb } from "@qmenut/db/client";
import type { TranslatableText } from "@qmenut/db/repositories/admin-translations.repository";

export interface TranslationContentInput {
  db: DrizzleDb;
  env?: RuntimeEnv;
  restaurantId: string;
  branchId?: string;
}

export function translationKey(item: { entityType: string; entityId: string; field: string }): string {
  return `${item.entityType}:${item.entityId}:${item.field}`;
}

export async function getTranslationContent({ db, env, restaurantId, branchId }: TranslationContentInput) {
  const [texts, branches, rows, locks] = await Promise.all([
    collectTranslatableTexts({ db, restaurantId, branchId }),
    listBranches({ db, restaurantId }),
    db.select().from(translations).where(eq(translations.restaurantId, restaurantId)).all(),
    listTranslationLocks({ db, restaurantId }),
  ]);
  if (env) {
    const taglines = await Promise.all(
      branches
        .filter((branch) => !branchId || branch.id === branchId)
        .map(async (branch): Promise<TranslatableText> => {
          const theme = branch.customDomain ? await getTheme(env, branch.customDomain) : null;
          return { entityType: "branch", entityId: branch.id, field: "tagline", text: theme?.tagline ?? "" };
        }),
    );
    texts.push(...taglines);
  }
  return { texts, rows, locks: new Set(locks.map((lock) => translationKey(lock))) };
}

export type TranslationContent = Awaited<ReturnType<typeof getTranslationContent>>;

export function languageTexts(content: TranslationContent, languageCode: string) {
  const stored = new Map(
    content.rows.filter((row) => row.languageCode === languageCode).map((row) => [translationKey(row), row]),
  );
  return content.texts.map((item) => {
    // A locked text stays in the base language, so it is always complete.
    if (content.locks.has(translationKey(item)))
      return { ...item, value: item.text, sourceText: item.text, isManual: false, complete: true, locked: true };
    const row = stored.get(translationKey(item));
    const complete = !item.text.trim() || Boolean(row?.value.trim() && row.sourceText === item.text);
    return {
      ...item,
      value: item.text.trim() ? (row?.value ?? "") : "",
      sourceText: row?.sourceText ?? null,
      isManual: row?.isManual ?? false,
      complete,
      locked: false,
    };
  });
}

export function publicTranslationMap(items: ReturnType<typeof languageTexts>) {
  const map = new Map<string, Map<string, string>>();
  for (const item of items) {
    const fields = map.get(item.entityId) ?? new Map<string, string>();
    fields.set(item.field, item.value);
    map.set(item.entityId, fields);
  }
  return map;
}
