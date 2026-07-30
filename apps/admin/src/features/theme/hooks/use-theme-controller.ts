import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { useMutationFeedback } from "~/shared/hooks/use-mutation-feedback";

import { getSaveThemeMutationOptions, getThemeQueryOptions } from "../api";
import { toThemeFormValues, toThemeInput } from "../mappers";
import { themeFormSchema } from "../types";

import type { ThemeFormValues } from "../types";

export function useThemeController(branchId: string) {
  const queryClient = useQueryClient();
  const { data: current } = useSuspenseQuery(getThemeQueryOptions({ branchId, trpc }));
  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: toThemeFormValues(current),
  });
  const save = useMutation(getSaveThemeMutationOptions({ branchId, queryClient, trpc }));
  const [primary, secondary, tagline] = useWatch({
    control: form.control,
    name: ["primary", "secondary", "tagline"],
  });
  return {
    form,
    feedback: useMutationFeedback(save, "Tema guardado."),
    pending: save.isPending,
    preview: { primary, secondary, tagline },
    submit: form.handleSubmit((values) => save.mutate(toThemeInput({ branchId, current, values }))),
  };
}
