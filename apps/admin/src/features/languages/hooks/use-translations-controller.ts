import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import {
  getLanguageCatalogQueryOptions,
  getLanguageMutationOptions,
  getTranslationsQueryOptions,
  getUpdateTranslationMutationOptions,
} from "~/features/languages/api";
import { toTranslationsFormValues } from "~/features/languages/mappers";
import { translationsSchema } from "~/features/languages/types";
import { trpc } from "~/lib/trpc";

import type { TranslationsFormValues } from "~/features/languages/types";

export function useTranslationsController(branchId: string, languageCode: string) {
  const queryClient = useQueryClient();
  const queryOptions = getTranslationsQueryOptions({ branchId, languageCode, trpc });
  const { data: catalogEntries } = useSuspenseQuery(getLanguageCatalogQueryOptions({ trpc }));
  const { data: catalog } = useSuspenseQuery(queryOptions);
  const form = useForm<TranslationsFormValues>({
    defaultValues: toTranslationsFormValues(catalog),
    resolver: zodResolver(translationsSchema),
  });
  const { fields } = useFieldArray({ control: form.control, name: "rows" });
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const context = { queryClient, trpc };
  const updateMutation = useMutation(getUpdateTranslationMutationOptions({ ...context, branchId, languageCode }));
  const translateMutation = useMutation(getLanguageMutationOptions(context).translate);
  const language = catalogEntries.find((entry) => entry.code === languageCode);
  function saveRow(index: number) {
    if (updateMutation.isPending) return;
    const row = form.getValues(`rows.${index}`);
    setSavingRow(index);
    updateMutation.mutate(
      { entityId: row.entityId, entityType: row.entityType, field: row.field, languageCode, value: row.value },
      {
        onSuccess: () => form.resetField(`rows.${index}.value`, { defaultValue: row.value }),
        onSettled: () => setSavingRow(null),
      },
    );
  }
  function translateMissing() {
    translateMutation.mutate(
      { languageCode, onlyMissing: true },
      {
        onSuccess: () => {
          void queryClient.fetchQuery(queryOptions).then((fresh) => {
            form.reset(toTranslationsFormValues(fresh));
          });
        },
      },
    );
  }
  return {
    catalog,
    deeplSupported: language?.deeplSupported ?? false,
    error: updateMutation.error ?? translateMutation.error,
    fields,
    form,
    languageLabel: language?.label ?? languageCode.toUpperCase(),
    saveRow,
    savingRow,
    translateBusy: translateMutation.isPending,
    translateMissing,
  };
}
