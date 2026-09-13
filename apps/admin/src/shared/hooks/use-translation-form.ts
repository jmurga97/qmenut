import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";

import { trpc } from "~/lib/trpc";

import type { RouterInputs, RouterOutputs } from "~/lib/trpc";

export type TranslationText = RouterOutputs["admin"]["translations"]["list"][number];
export type TranslationSaveRow = RouterInputs["admin"]["translations"]["save"]["rows"][number];

type TranslationKey = Pick<TranslationText, "entityId" | "entityType" | "field">;

function keyOf({ entityId, entityType, field }: TranslationKey) {
  return `${entityType}:${entityId}:${field}`;
}

export function useTranslationForm({ branchId, languageCode }: { branchId: string; languageCode: string }) {
  const queryClient = useQueryClient();
  const queryOptions = trpc.admin.translations.list.queryOptions({ branchId, languageCode });
  const { data: rows } = useSuspenseQuery(queryOptions);
  // Keep the source that the editor opened; a background refresh must not acknowledge a changed source.
  const sources = useRef(rows);
  const save = useMutation(
    trpc.admin.translations.save.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.admin.translations.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.admin.languages.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.admin.menu.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.admin.promotions.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.admin.loyalty.pathKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.admin.theme.pathKey() }),
        ]);
        sources.current = queryClient.getQueryData(queryOptions.queryKey) ?? sources.current;
      },
    }),
  );
  const { mutateAsync, isPending } = save;
  return useMemo(() => {
    const byKey = new Map(sources.current.map((row) => [keyOf(row), row]));

    function item(input: TranslationKey) {
      return byKey.get(keyOf(input));
    }

    function value({ entityType, entityId, field, fallback = "" }: TranslationKey & { fallback?: string }) {
      const row = item({ entityId, entityType, field });
      return row ? row.value || row.text : fallback;
    }

    function saveRow({
      entityType,
      entityId,
      field,
      value,
    }: TranslationKey & { value: string }): TranslationSaveRow | null {
      const source = item({ entityId, entityType, field });
      if (!source || (source.complete && source.value === value)) return null;
      return {
        entityId,
        entityType,
        field,
        sourceText: source.text,
        value,
      };
    }

    function isIncomplete(input: TranslationKey) {
      return !item(input)?.complete;
    }

    return {
      pending: isPending,
      rows: sources.current,
      saveRows: (saveRows: TranslationSaveRow[]) => mutateAsync({ branchId, languageCode, rows: saveRows }),
      saveRow,
      isIncomplete,
      value,
    };
  }, [branchId, languageCode, isPending, mutateAsync]);
}
