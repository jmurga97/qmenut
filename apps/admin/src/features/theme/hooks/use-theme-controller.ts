import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { useMutationFeedback } from "~/shared/hooks/use-mutation-feedback";

import { getSaveThemeMutationOptions, getThemeQueryOptions } from "../api";
import { toThemeDraft, toThemeFormValues, toThemeInput } from "../mappers";
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
  const watchedValues = useWatch({
    control: form.control,
  });
  const { bodyFont, headingFont, primary, secondary, showDishPhoto, showMenuPhotos, tagline, template } = watchedValues;
  // Keyed on the parsed values' primitives so the draft keeps referential identity across
  // unrelated re-renders and ThemePreview only postMessages when the draft really changes.
  const preview = useMemo(() => {
    const parsed = themeFormSchema.safeParse({
      bodyFont,
      headingFont,
      primary,
      secondary,
      showDishPhoto,
      showMenuPhotos,
      tagline,
      template,
    });
    return parsed.success ? toThemeDraft({ current, values: parsed.data }) : null;
  }, [bodyFont, current, headingFont, primary, secondary, showDishPhoto, showMenuPhotos, tagline, template]);
  return {
    form,
    feedback: useMutationFeedback(save, "Tema guardado."),
    pending: save.isPending,
    preview,
    submit: form.handleSubmit((values) => save.mutate(toThemeInput({ branchId, current, values }))),
  };
}
