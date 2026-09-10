import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

interface BranchQueryInput {
  branchId: string;
  languageCode?: string | null;
  trpc: TrpcOptionsProxy;
}
interface DetailQueryInput {
  dishId: string;
  languageCode?: string | null;
  trpc: TrpcOptionsProxy;
}
interface MenuMutationInput extends BranchQueryInput {
  queryClient: QueryClient;
}
export function getMenuCategoriesQueryOptions({ branchId, languageCode, trpc }: BranchQueryInput) {
  return trpc.admin.menu.categories.list.queryOptions({ branchId, languageCode: languageCode ?? undefined });
}
export function getMenuDishesQueryOptions({ branchId, languageCode, trpc }: BranchQueryInput) {
  return trpc.admin.menu.dishes.list.queryOptions({ branchId, languageCode: languageCode ?? undefined });
}
export function getDishDetailQueryOptions({ dishId, languageCode, trpc }: DetailQueryInput) {
  return trpc.admin.menu.dishes.detail.queryOptions({ dishId, languageCode: languageCode ?? undefined });
}
export function getMenuTagsQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.menu.taxonomy.tags.queryOptions();
}
export function getMenuAllergensQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.menu.taxonomy.allergens.queryOptions();
}
export function getMenuIngredientsQueryOptions({
  languageCode,
  trpc,
}: {
  languageCode?: string | null;
  trpc: TrpcOptionsProxy;
}) {
  return trpc.admin.menu.taxonomy.ingredients.queryOptions({ languageCode: languageCode ?? undefined });
}
function invalidateMenu({ branchId, languageCode, queryClient, trpc }: MenuMutationInput) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getMenuCategoriesQueryOptions({ branchId, languageCode, trpc }).queryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: getMenuDishesQueryOptions({ branchId, languageCode, trpc }).queryKey,
    }),
  ]);
}
export function getCategoryMutationOptions(input: MenuMutationInput) {
  const options = { onSuccess: () => invalidateMenu(input) };
  return {
    create: input.trpc.admin.menu.categories.create.mutationOptions(options),
    update: input.trpc.admin.menu.categories.update.mutationOptions(options),
  };
}
export function getDishMutationOptions(input: MenuMutationInput) {
  return {
    create: input.trpc.admin.menu.dishes.create.mutationOptions(),
    createIngredient: input.trpc.admin.menu.taxonomy.createIngredient.mutationOptions({
      onSuccess: () =>
        input.queryClient.invalidateQueries({ queryKey: getMenuIngredientsQueryOptions(input).queryKey }),
    }),
    relations: input.trpc.admin.menu.dishes.saveRelations.mutationOptions({ onSuccess: () => invalidateMenu(input) }),
    update: input.trpc.admin.menu.dishes.update.mutationOptions(),
  };
}
export function getDishAvailabilityMutationOptions(input: MenuMutationInput) {
  return input.trpc.admin.menu.dishes.setAvailability.mutationOptions({
    onSuccess: () => invalidateMenu(input),
  });
}
