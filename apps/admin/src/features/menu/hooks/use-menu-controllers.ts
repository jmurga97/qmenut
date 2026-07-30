import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { useForm } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { formatMoney } from "~/shared/services/money";

import {
  getCategoryMutationOptions,
  getDishAvailabilityMutationOptions,
  getDishMutationOptions,
  getMenuAllergensQueryOptions,
  getMenuCategoriesQueryOptions,
  getMenuDishesQueryOptions,
  getMenuIngredientsQueryOptions,
  getMenuTagsQueryOptions,
} from "../api";
import { toDishFormValues, toDishInput } from "../mappers";
import { categoryFormSchema, dishFormSchema } from "../types";

import type { CategoryFormValues, DishDetail, DishFormValues } from "../types";

export function useMenuListController(branchId: string) {
  const queryClient = useQueryClient();
  const categories = useSuspenseQuery(getMenuCategoriesQueryOptions({ branchId, trpc })).data;
  const dishes = useSuspenseQuery(getMenuDishesQueryOptions({ branchId, trpc })).data;
  const availability = useMutation(getDishAvailabilityMutationOptions({ branchId, queryClient, trpc }));
  return {
    availabilityError: availability.error,
    availabilityPendingDishId: availability.isPending ? availability.variables?.dishId : undefined,
    categories,
    dishes,
    setAvailability: (dishId: string, isActive: boolean) => availability.mutate({ branchId, dishId, isActive }),
  };
}
export function useCategoryEditorController({ branchId, categoryId }: { branchId: string; categoryId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const categories = useSuspenseQuery(getMenuCategoriesQueryOptions({ branchId, trpc })).data;
  const category = categoryId ? categories.find(({ id }) => id === categoryId) : undefined;
  const form = useForm<CategoryFormValues>({
    defaultValues: {
      description: category?.description ?? "",
      imageUrl: category?.imageUrl ?? "",
      isActive: category?.isActive ?? true,
      name: category?.name ?? "",
    },
    resolver: zodResolver(categoryFormSchema),
  });
  const mutationInput = { branchId, queryClient, trpc };
  const options = getCategoryMutationOptions(mutationInput);
  const create = useMutation(options.create);
  const update = useMutation(options.update);
  const cancel = () => void navigate({ to: "/menu" });
  const submit = form.handleSubmit((values) => {
    const data = {
      ...values,
      description: values.description || undefined,
      imageUrl: values.imageUrl || undefined,
      position: category?.position ?? categories.length,
    };
    if (categoryId) update.mutate({ categoryId, data }, { onSuccess: cancel });
    else create.mutate({ branchId, data }, { onSuccess: cancel });
  });
  return {
    busy: create.isPending || update.isPending,
    cancel,
    category,
    error: create.error ?? update.error,
    form,
    submit,
  };
}
export function useDishEditorController({ branchId, dish }: { branchId: string; dish: DishDetail | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dishId = useRef(dish?.id);
  const categories = useSuspenseQuery(getMenuCategoriesQueryOptions({ branchId, trpc })).data;
  const tags = useSuspenseQuery(getMenuTagsQueryOptions({ trpc })).data;
  const allergens = useSuspenseQuery(getMenuAllergensQueryOptions({ trpc })).data;
  const ingredients = useSuspenseQuery(getMenuIngredientsQueryOptions({ trpc })).data;
  const form = useForm<DishFormValues>({
    defaultValues: toDishFormValues(dish),
    resolver: zodResolver(dishFormSchema),
  });
  const options = getDishMutationOptions({ branchId, queryClient, trpc });
  const create = useMutation(options.create);
  const createIngredient = useMutation(options.createIngredient);
  const update = useMutation(options.update);
  const relations = useMutation(options.relations);
  const cancel = () => void navigate({ to: "/menu" });
  const addExtra = async ({ name, price }: { name: string; price: number }) => {
    const { id } = await createIngredient.mutateAsync({ isActive: true, name, price });
    const extraIngredientIds = form.getValues("extraIngredientIds");
    form.setValue("extraIngredientIds", [...extraIngredientIds, id], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const submit = form.handleSubmit((values) => {
    relations.reset();
    const data = toDishInput({ position: dish?.position ?? 0, values });
    const saveRelations = ({ id }: { id: string }) => {
      dishId.current = id;
      relations.mutate(
        {
          allergenIds: values.allergenIds,
          dishId: id,
          extraIngredientIds: values.extraIngredientIds,
          tagIds: values.tagIds,
        },
        { onSuccess: cancel },
      );
    };
    if (dishId.current) update.mutate({ branchId, data, dishId: dishId.current }, { onSuccess: saveRelations });
    else create.mutate({ branchId, data }, { onSuccess: saveRelations });
  });
  return {
    allergenOptions: allergens.map(({ code, id }) => ({ id, label: code })),
    addExtra,
    busy: create.isPending || createIngredient.isPending || update.isPending || relations.isPending,
    cancel,
    categoryOptions: categories.map(({ id, name }) => ({ id, label: name })),
    error: create.error ?? createIngredient.error ?? update.error ?? relations.error,
    extraOptions: ingredients.map(({ id, name, price }) => ({
      id,
      label: price > 0 ? `${name} +${formatMoney(price)}` : name,
    })),
    form,
    submit,
    tagOptions: tags.map((tag) => ({ id: tag.id, label: tag.label ?? tag.code ?? tag.id })),
  };
}
