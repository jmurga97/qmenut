import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { useMutationFeedback } from "~/shared/hooks/use-mutation-feedback";

import { getBranchQueryOptions, getSaveBranchMutationOptions } from "../api";
import { toBranchFormValues, toBranchInput } from "../mappers";
import { branchFormSchema } from "../types";

import type { BranchFormValues } from "../types";

export function useBranchController(branchId: string) {
  const queryClient = useQueryClient();
  const { data: settings } = useSuspenseQuery(getBranchQueryOptions({ branchId, trpc }));
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: toBranchFormValues(settings),
  });
  const fields = useFieldArray({ control: form.control, name: "schedules" }).fields;
  const schedules = useWatch({ control: form.control, name: "schedules" });
  const save = useMutation(getSaveBranchMutationOptions({ branchId, queryClient, trpc }));
  return {
    fields,
    form,
    schedules,
    settings,
    feedback: useMutationFeedback(save, "Cambios guardados."),
    pending: save.isPending,
    submit: form.handleSubmit((values) => save.mutate(toBranchInput({ branchId, settings, values }))),
  };
}
