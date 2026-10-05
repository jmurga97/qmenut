import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { i18n } from "~/lib/i18n";
import { trpc, trpcClient } from "~/lib/trpc";

import { keyOf, ownerOf, storedValue } from "./translation-model";

import type { Drafts, SaveRow, TextItem } from "./translation-model";

type Filter = "all" | "pending" | "modified";
const SAVE_CHUNK = 100;

/** Translatable texts of the scope, without empty originals, plus each entity's source name. */
export function useTranslationTexts({
  branchId,
  languageCode,
  entityId,
  entityType,
}: {
  branchId: string;
  languageCode: string;
  entityId?: string;
  entityType?: TextItem["entityType"];
}) {
  const { data } = useSuspenseQuery(trpc.admin.translations.list.queryOptions({ branchId, languageCode }));
  const items = data.filter(
    (row) =>
      row.text.trim() && (!entityId || row.entityId === entityId) && (!entityType || row.entityType === entityType),
  );
  const names = new Map(items.filter((item) => item.field === "name").map((item) => [item.entityId, item.text]));
  return { items, names };
}

/** Unsaved values by text key. A pending text stays drafted even when unchanged, so saving it as-is confirms it. */
export function useTranslationDrafts() {
  const [drafts, setDrafts] = useState<Drafts>(() => new Map());
  function update(change: (next: Map<string, string>) => void) {
    setDrafts((current) => {
      const next = new Map(current);
      change(next);
      return next;
    });
  }
  return {
    drafts,
    change: (item: TextItem, value: string) =>
      update((next) => {
        if (value === storedValue(item) && item.complete) next.delete(keyOf(item));
        else next.set(keyOf(item), value);
      }),
    undo: (item: TextItem) => update((next) => next.delete(keyOf(item))),
    discard: () => setDrafts(new Map()),
  };
}

/** Search and status filter. Opens on pending texts when there are any, unless scoped to one entity. */
export function useTranslationFilter({
  drafts,
  items,
  names,
  scoped,
}: {
  drafts: Drafts;
  items: TextItem[];
  names: ReadonlyMap<string, string>;
  scoped: boolean;
}) {
  const pending = items.filter((item) => !item.complete).length;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(pending > 0 && !scoped ? "pending" : "all");
  const query = search.trim().toLocaleLowerCase();
  function isVisible(item: TextItem) {
    if (filter === "pending" && item.complete) return false;
    if (filter === "modified" && !drafts.has(keyOf(item))) return false;
    const haystack = `${names.get(ownerOf(item)) ?? ""} ${item.text} ${drafts.get(keyOf(item)) ?? item.value}`;
    return haystack.toLocaleLowerCase().includes(query);
  }
  return {
    counts: { all: items.length, pending, modified: drafts.size } satisfies Record<Filter, number>,
    filter,
    isVisible,
    search,
    setFilter,
    setSearch,
  };
}

/** Saves every drafted text in endpoint-sized chunks, then refreshes what depends on translations. */
export function useSaveTranslations({
  branchId,
  languageCode,
  onSaved,
}: {
  branchId: string;
  languageCode: string;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ drafts, items }: { drafts: Drafts; items: TextItem[] }) => {
      const rows = items.flatMap((item): SaveRow[] => {
        const value = drafts.get(keyOf(item));
        if (value === undefined) return [];
        const { entityId, entityType, field, text: sourceText } = item;
        return [{ entityId, entityType, field, sourceText, value }];
      });
      for (let start = 0; start < rows.length; start += SAVE_CHUNK)
        await trpcClient.admin.translations.save.mutate({
          branchId,
          languageCode,
          rows: rows.slice(start, start + SAVE_CHUNK),
        });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.admin.translations.pathKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.admin.languages.pathKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.admin.menu.pathKey() }),
      ]);
      onSaved();
      toast.success(i18n.t("shared___Traducción guardada."));
    },
  });
}
