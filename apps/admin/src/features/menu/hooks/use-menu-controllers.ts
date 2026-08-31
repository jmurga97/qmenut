import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { useForm } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { isDraftBusy } from "~/shared/images/image-draft";
import { useImageDraft } from "~/shared/images/use-image-drafts";
import { useImageSave } from "~/shared/images/use-image-save";
import { usePrepareImageDrafts } from "~/shared/images/use-image-uploads";
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
import { toAllergenDisplayLabel, toDishFormValues, toDishInput, toTagDisplayLabel } from "../mappers";
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
      isActive: category?.isActive ?? true,
      name: category?.name ?? "",
    },
    resolver: zodResolver(categoryFormSchema),
  });
  const mutationInput = { branchId, queryClient, trpc };
  const options = getCategoryMutationOptions(mutationInput);
  const create = useMutation(options.create);
  const update = useMutation(options.update);
  const image = useImageDraft(category?.imageUrl ?? null);
  const { prepare } = usePrepareImageDrafts();
  const imageSave = useImageSave();
  const cancel = () => void navigate({ to: "/menu" });
  const submit = form.handleSubmit((values) =>
    imageSave.run(async () => {
      const [prepared] = await prepare({
        branchId,
        purpose: "categoryImage",
        drafts: [image.draft],
        updateDraft: image.update,
      });
      if (!prepared) throw new Error("No se pudo preparar la imagen.");
      const data = {
        ...values,
        description: values.description || undefined,
        imageUrl: prepared.imageUrl ?? undefined,
        imageUploadId: prepared.uploadId,
        position: category?.position ?? categories.length,
      };
      if (categoryId) await update.mutateAsync({ categoryId, data });
      else await create.mutateAsync({ branchId, data });
      cancel();
    }),
  );
  return {
    busy: imageSave.pending || create.isPending || update.isPending || isDraftBusy(image.draft),
    cancel,
    category,
    error: imageSave.error ?? create.error ?? update.error,
    form,
    image,
    submit,
  };
}
export function useDishEditorController({ branchId, dish }: { branchId: string; dish: DishDetail | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dishId = useRef(dish?.id);
  const categories = useSuspenseQuery(getMenuCategoriesQueryOptions({ branchId, trpc })).data;
  const tenant = useSuspenseQuery(getTenantQueryOptions({ trpc })).data;
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
  const image = useImageDraft(dish?.imageUrl ?? null);
  const { prepare } = usePrepareImageDrafts();
  const imageSave = useImageSave();
  const cancel = () => void navigate({ to: "/menu" });
  const addExtra = async ({ name, price }: { name: string; price: number }) => {
    const { id } = await createIngredient.mutateAsync({ isActive: true, name, price });
    const extraIngredientIds = form.getValues("extraIngredientIds");
    form.setValue("extraIngredientIds", [...extraIngredientIds, id], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  const submit = form.handleSubmit((values) =>
    imageSave.run(async () => {
      relations.reset();
      const [prepared] = await prepare({
        branchId,
        purpose: "dishImage",
        drafts: [image.draft],
        updateDraft: image.update,
      });
      if (!prepared) throw new Error("No se pudo preparar la imagen.");
      const data = toDishInput({
        imageUploadId: prepared.uploadId,
        imageUrl: prepared.imageUrl,
        position: dish?.position ?? 0,
        values,
      });
      const saved = dishId.current
        ? await update.mutateAsync({ branchId, data, dishId: dishId.current })
        : await create.mutateAsync({ branchId, data });
      dishId.current = saved.id;
      await relations.mutateAsync({
        allergenIds: values.allergenIds,
        dishId: saved.id,
        extraIngredientIds: values.extraIngredientIds,
        tagIds: values.tagIds,
      });
      cancel();
    }),
  );
  return {
    allergenOptions: allergens.map(({ code, id }) => ({ id, label: toAllergenDisplayLabel(code) })),
    addExtra,
    busy:
      imageSave.pending ||
      create.isPending ||
      createIngredient.isPending ||
      update.isPending ||
      relations.isPending ||
      isDraftBusy(image.draft),
    cancel,
    categoryOptions: categories.map(({ id, name }) => ({ id, label: name })),
    error: imageSave.error ?? create.error ?? createIngredient.error ?? update.error ?? relations.error,
    extraOptions: ingredients.map(({ id, name, price }) => ({
      id,
      label: price > 0 ? `${name} +${formatMoney(price, tenant.restaurant.sourceCurrency)}` : name,
    })),
    form,
    image,
    submit,
    tagOptions: tags.map((tag) => ({ id: tag.id, label: toTagDisplayLabel(tag) })),
  };
}
