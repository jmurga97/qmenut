import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { i18n } from "~/lib/i18n";
import { notifyError } from "~/lib/notifications";
import { trpc } from "~/lib/trpc";
import { getMenuCategoriesQueryOptions, getMenuDishesQueryOptions, getTenantQueryOptions } from "~/shared/api";
import { useSelectedLanguage } from "~/shared/hooks/use-selected-language";
import { useImageDraft } from "~/shared/images/use-image-drafts";
import { useImageSave } from "~/shared/images/use-image-save";
import { useImageUploads } from "~/shared/images/use-image-uploads";
import { toAllergenDisplayLabel } from "~/shared/services/allergens";
import { formatMoney } from "~/shared/services/money";

import {
  getCategoryMutationOptions,
  getCategoryReorderMutationOptions,
  getDishAvailabilityMutationOptions,
  getDishMutationOptions,
  getMenuAllergensQueryOptions,
  getMenuIngredientsQueryOptions,
  getMenuTagsQueryOptions,
} from "../api";
import {
  toCategoryInput,
  toCategoryScheduleValues,
  toDishFormValues,
  toDishInput,
  toTagDisplayLabel,
} from "../mappers";
import { categoryFormSchema, dishFormSchema } from "../types";

import type { CategoryFormValues, DishDetail, DishFormValues } from "../types";

export function useMenuListController(branchId: string) {
  const queryClient = useQueryClient();
  const { languageCode } = useSelectedLanguage();
  const categories = useSuspenseQuery(getMenuCategoriesQueryOptions({ branchId, languageCode, trpc })).data;
  const dishes = useSuspenseQuery(getMenuDishesQueryOptions({ branchId, languageCode, trpc })).data;
  const availability = useMutation(getDishAvailabilityMutationOptions({ branchId, languageCode, queryClient, trpc }));
  const reorder = useMutation(getCategoryReorderMutationOptions({ branchId, languageCode, queryClient, trpc }));
  const moveCategory = (index: number, offset: -1 | 1) => {
    const categoryIds = categories.map(({ id }) => id);
    const target = index + offset;
    if (target < 0 || target >= categoryIds.length) return;
    [categoryIds[index], categoryIds[target]] = [categoryIds[target], categoryIds[index]];
    reorder.mutate({ branchId, categoryIds });
  };
  return {
    categories,
    dishes,
    moveCategory,
    setAvailability: (dishId: string, isActive: boolean) => availability.mutate({ branchId, dishId, isActive }),
  };
}
export function useCategoryEditorController({
  branchId,
  categoryId,
  languageCodeOverride,
}: {
  branchId: string;
  categoryId?: string;
  languageCodeOverride?: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedLanguage = useSelectedLanguage();
  const languageCode = languageCodeOverride === null ? null : (languageCodeOverride ?? selectedLanguage.languageCode);
  const categories = useSuspenseQuery(getMenuCategoriesQueryOptions({ branchId, languageCode, trpc })).data;
  const category = categoryId ? categories.find(({ id }) => id === categoryId) : undefined;
  const form = useForm<CategoryFormValues>({
    defaultValues: {
      description: category?.description ?? "",
      isActive: category?.isActive ?? true,
      name: category?.name ?? "",
      ...toCategoryScheduleValues(category),
    },
    resolver: zodResolver(categoryFormSchema),
  });
  const mutationInput = { branchId, languageCode, queryClient, trpc };
  const options = getCategoryMutationOptions(mutationInput);
  const create = useMutation(options.create);
  const update = useMutation(options.update);
  const image = useImageDraft(category?.imageUrl ?? null);
  const uploads = useImageUploads();
  const imageSave = useImageSave();
  const cancel = () => void navigate({ to: "/menu/categories", ignoreBlocker: true });
  const submit = form.handleSubmit(async (values) => {
    let createdId: string | undefined;
    const succeeded = await imageSave.run(async () => {
      const [prepared] = await uploads.transfer({
        branchId,
        groups: [
          {
            purpose: "categoryImage",
            drafts: [image.draft],
            updateDraft: image.update,
          },
        ],
      });
      if (!prepared) throw new Error(i18n.t("menu___No se pudo preparar la imagen."));
      const data = {
        ...toCategoryInput(values),
        description: values.description || undefined,
        imageUrl: prepared.imageUrl ?? undefined,
        imageUploadId: prepared.uploadId,
        imageChange: prepared.imageChange,
        position: category?.position ?? categories.length,
      };
      const operationId = imageSave.operationIdFor({ categoryId, branchId, data });
      if (categoryId) {
        await update.mutateAsync({ categoryId, data, operationId });
      } else {
        const created = await create.mutateAsync({ branchId, data, operationId });
        createdId = created.id;
      }
      void queryClient.invalidateQueries({ queryKey: trpc.admin.images.assignments.pathKey() });
    }, uploads.clear);
    if (!succeeded) return;
    toast.success(i18n.t("menu___Categoría guardada."));
    if (createdId) {
      await navigate({ to: "/menu/categories/$categoryId", params: { categoryId: createdId }, ignoreBlocker: true });
      return;
    }
    form.reset(values);
    image.accept();
  });
  return {
    operation: uploads.operation,
    busy: imageSave.pending || create.isPending || update.isPending,
    cancel,
    category,
    form,
    image,
    submit,
  };
}
export function useDishEditorController({
  branchId,
  dish,
  languageCodeOverride,
}: {
  branchId: string;
  dish: DishDetail | null;
  languageCodeOverride?: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedLanguage = useSelectedLanguage();
  const languageCode = languageCodeOverride === null ? null : (languageCodeOverride ?? selectedLanguage.languageCode);
  const dishId = useRef(dish?.id);
  const categories = useSuspenseQuery(getMenuCategoriesQueryOptions({ branchId, languageCode, trpc })).data;
  const tenant = useSuspenseQuery(getTenantQueryOptions({ trpc })).data;
  const tags = useSuspenseQuery(getMenuTagsQueryOptions({ trpc })).data;
  const allergens = useSuspenseQuery(getMenuAllergensQueryOptions({ trpc })).data;
  const ingredients = useSuspenseQuery(getMenuIngredientsQueryOptions({ languageCode, trpc })).data;
  const form = useForm<DishFormValues>({
    defaultValues: toDishFormValues(dish),
    resolver: zodResolver(dishFormSchema),
  });
  const options = getDishMutationOptions({ branchId, languageCode, queryClient, trpc });
  const create = useMutation(options.create);
  const update = useMutation(options.update);
  const relations = useMutation(options.relations);
  const remove = useMutation(options.remove);
  const image = useImageDraft(dish?.imageUrl ?? null);
  const uploads = useImageUploads();
  const imageSave = useImageSave();
  const cancel = () => void navigate({ to: "/menu/dishes", ignoreBlocker: true });
  const submit = form.handleSubmit(async (values) => {
    const succeeded = await imageSave.run(async () => {
      relations.reset();
      const [prepared] = await uploads.transfer({
        branchId,
        groups: [
          {
            purpose: "dishImage",
            drafts: [image.draft],
            updateDraft: image.update,
          },
        ],
      });
      if (!prepared) throw new Error(i18n.t("menu___No se pudo preparar la imagen."));
      const data = toDishInput({
        imageUploadId: prepared.uploadId,
        imageUrl: prepared.imageUrl,
        position: dish?.position ?? 0,
        values,
      });
      const writeData = { ...data, imageChange: prepared.imageChange };
      const operationId = imageSave.operationIdFor({ branchId, dishId: dishId.current, data: writeData });
      const saved = dishId.current
        ? await update.mutateAsync({ branchId, data: writeData, dishId: dishId.current, operationId })
        : await create.mutateAsync({ branchId, data: writeData, operationId });
      dishId.current = saved.id;
      void queryClient.invalidateQueries({ queryKey: trpc.admin.images.assignments.pathKey() });
      await relations.mutateAsync({
        allergenIds: values.allergenIds,
        dishId: saved.id,
        extraIngredientIds: values.extraIngredientIds,
        tagIds: values.tagIds,
      });
    }, uploads.clear);
    if (!succeeded || !dishId.current) return;
    toast.success(i18n.t("menu___Plato guardado."));
    if (!dish) {
      await navigate({ to: "/menu/dishes/$dishId", params: { dishId: dishId.current }, ignoreBlocker: true });
      return;
    }
    form.reset(values);
    image.accept();
  });
  const removeDish = async () => {
    if (!dish) return;
    try {
      await remove.mutateAsync({ dishId: dish.id });
      toast.success(i18n.t("menu___Plato eliminado."));
      await navigate({ to: "/menu/dishes", ignoreBlocker: true });
    } catch (error) {
      notifyError(error);
    }
  };
  return {
    allergenOptions: allergens.map(({ code, id }) => ({ id, label: toAllergenDisplayLabel(code) })),
    operation: uploads.operation,
    busy: imageSave.pending || create.isPending || update.isPending || relations.isPending,
    cancel,
    categoryOptions: categories.map(({ id, name }) => ({ id, label: name })),
    extraOptions: ingredients.map(({ id, name, price }) => ({
      id,
      label: price > 0 ? `${name} +${formatMoney(price, tenant.restaurant.sourceCurrency)}` : name,
    })),
    form,
    image,
    removeDish,
    removing: remove.isPending,
    submit,
    tagOptions: tags.map((tag) => ({ id: tag.id, label: toTagDisplayLabel(tag) })),
  };
}
