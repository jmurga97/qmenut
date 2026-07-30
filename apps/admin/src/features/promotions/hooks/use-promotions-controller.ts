import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

import { getMenuCategoriesQueryOptions, getMenuDishesQueryOptions } from "~/features/menu/api";
import { trpc } from "~/lib/trpc";

import { getPromotionMutationOptions, getPromotionsQueryOptions } from "../api";
import { toPromotionFormValues, toPromotionInput } from "../mappers";
import { promotionFormSchema } from "../types";

import type { EditablePromotion, PromotionFormValues } from "../types";

export function usePromotionsListController(branchId: string) {
  return useSuspenseQuery(getPromotionsQueryOptions({ branchId, trpc })).data;
}
export function usePromotionEditorController({
  branchId,
  promotion,
}: {
  branchId: string;
  promotion: EditablePromotion | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories } = useSuspenseQuery(getMenuCategoriesQueryOptions({ branchId, trpc }));
  const { data: dishes } = useSuspenseQuery(getMenuDishesQueryOptions({ branchId, trpc }));
  const form = useForm<PromotionFormValues>({
    defaultValues: toPromotionFormValues(promotion),
    resolver: zodResolver(promotionFormSchema),
  });
  const scope = useWatch({ control: form.control, name: "scope" });
  const type = useWatch({ control: form.control, name: "type" });
  const previousScope = useRef(scope);
  const { setValue } = form;
  useEffect(() => {
    if (previousScope.current === scope) return;
    previousScope.current = scope;
    setValue("targetIds", [], { shouldValidate: true });
  }, [scope, setValue]);
  const mutationInput = { branchId, queryClient, trpc };
  const options = getPromotionMutationOptions(mutationInput);
  const createMutation = useMutation(options.create);
  const updateMutation = useMutation(options.update);
  const cancel = () => void navigate({ to: "/promotions" });
  const submit = form.handleSubmit((values) => {
    const input = toPromotionInput({ promotion, values });
    if (promotion) {
      updateMutation.mutate({ promotionId: promotion.id, ...input }, { onSuccess: cancel });
      return;
    }
    createMutation.mutate({ branchId, ...input }, { onSuccess: cancel });
  });
  const targets = scope === "dish" ? dishes : categories;
  return {
    busy: createMutation.isPending || updateMutation.isPending,
    cancel,
    error: createMutation.error ?? updateMutation.error,
    form,
    scope,
    submit,
    targetOptions: targets.map(({ id, name }) => ({ id, label: name })),
    type,
  };
}
