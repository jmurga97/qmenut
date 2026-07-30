import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  getLanguageCatalogQueryOptions,
  getLanguageMutationOptions,
  getLanguagesQueryOptions,
} from "~/features/languages/api";
import { addLanguageSchema } from "~/features/languages/types";
import { trpc } from "~/lib/trpc";

import type { AddLanguageFormValues } from "~/features/languages/types";

export function useLanguagesController() {
  const [addOutcome, setAddOutcome] = useState<"failed" | "ok" | "skipped" | "unavailable" | "unsupported" | null>(
    null,
  );
  const queryClient = useQueryClient();
  const context = { queryClient, trpc };
  const { data: languages } = useSuspenseQuery(getLanguagesQueryOptions({ trpc }));
  const { data: catalog } = useSuspenseQuery(getLanguageCatalogQueryOptions({ trpc }));
  const mutations = getLanguageMutationOptions(context);
  const addMutation = useMutation(mutations.add);
  const activeMutation = useMutation(mutations.active);
  const removeMutation = useMutation(mutations.remove);
  const translateMutation = useMutation(mutations.translate);
  const form = useForm<AddLanguageFormValues>({
    defaultValues: { autoTranslate: true, languageCode: "" },
    resolver: zodResolver(addLanguageSchema),
  });
  const existingCodes = new Set(languages.languages.map((language) => language.languageCode));
  const options = catalog
    .filter((entry) => !existingCodes.has(entry.code))
    .map((entry) => ({
      id: entry.code,
      label: entry.label,
    }));
  let pendingCode: string | null = null;
  if (activeMutation.isPending) pendingCode = activeMutation.variables.languageCode;
  else if (removeMutation.isPending) pendingCode = removeMutation.variables.languageCode;
  else if (translateMutation.isPending) pendingCode = translateMutation.variables.languageCode;
  function add(values: AddLanguageFormValues) {
    setAddOutcome(null);
    addMutation.mutate(values, {
      onSuccess: (data) => {
        form.reset();
        setAddOutcome(data.translation);
      },
    });
  }
  function act({ languageCode, isActive }: { languageCode: string; isActive: boolean }, action: string) {
    const actions: Record<string, () => void> = {
      remove: () => removeMutation.mutate({ deleteTranslations: true, languageCode }),
      toggle: () => activeMutation.mutate({ isActive: !isActive, languageCode }),
      translate: () => translateMutation.mutate({ languageCode, onlyMissing: true }),
    };
    actions[action]?.();
  }
  return {
    act,
    catalog,
    form,
    languages: languages.languages,
    options,
    add,
    addOutcome,
    addBusy: addMutation.isPending,
    error: addMutation.error ?? activeMutation.error ?? removeMutation.error ?? translateMutation.error,
    pendingCode,
  };
}
