import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { getLanguageCatalogQueryOptions, getLanguageMutationOptions } from "~/features/languages/api";
import { addLanguageSchema } from "~/features/languages/types";
import { trpc } from "~/lib/trpc";
import { getLanguagesQueryOptions } from "~/shared/api";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import type { AddLanguageFormValues } from "~/features/languages/types";

export function useLanguagesController() {
  const branch = useSelectedBranch();
  const queryClient = useQueryClient();
  const context = { queryClient, trpc };
  const { data: languages } = useSuspenseQuery(getLanguagesQueryOptions({ trpc }));
  const { data: catalog } = useSuspenseQuery(getLanguageCatalogQueryOptions({ trpc }));
  const mutations = getLanguageMutationOptions(context);
  const addMutation = useMutation(mutations.add);
  const removeMutation = useMutation(mutations.remove);
  const translateMutation = useMutation(mutations.translate);
  const form = useForm<AddLanguageFormValues>({
    defaultValues: { languageCode: "" },
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
  if (removeMutation.isPending) pendingCode = removeMutation.variables.languageCode;
  else if (translateMutation.isPending) pendingCode = translateMutation.variables.languageCode;
  function add(values: AddLanguageFormValues) {
    addMutation.mutate(values, {
      onSuccess: () => form.reset(),
    });
  }
  function act(languageCode: string, action: "remove" | "translate") {
    if (action === "remove") {
      removeMutation.mutate({ languageCode });
      return;
    }
    if (branch) translateMutation.mutate({ branchId: branch.id, languageCode });
  }
  return {
    act,
    catalog,
    form,
    languages: languages.languages,
    options,
    add,
    branch,
    addBusy: addMutation.isPending,
    error: addMutation.error ?? removeMutation.error ?? translateMutation.error,
    pendingCode,
  };
}
