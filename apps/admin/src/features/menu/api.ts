import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

interface BranchQueryInput {
  branchId: string;
  trpc: TrpcOptionsProxy;
}
interface DetailQueryInput {
  dishId: string;
  trpc: TrpcOptionsProxy;
}
interface MenuMutationInput extends BranchQueryInput {
  queryClient: QueryClient;
}
export function getMenuCategoriesQueryOptions({ branchId, trpc }: BranchQueryInput) {
  return trpc.admin.menu.categories.list.queryOptions({ branchId });
}
export function getMenuDishesQueryOptions({ branchId, trpc }: BranchQueryInput) {
  return trpc.admin.menu.dishes.list.queryOptions({ branchId });
}
export function getDishDetailQueryOptions({ dishId, trpc }: DetailQueryInput) {
  return trpc.admin.menu.dishes.detail.queryOptions({ dishId });
}
export function getMenuTagsQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.menu.taxonomy.tags.queryOptions();
}
export function getMenuAllergensQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.menu.taxonomy.allergens.queryOptions();
}
export function getMenuIngredientsQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.menu.taxonomy.ingredients.queryOptions();
}
function invalidateMenu({ branchId, queryClient, trpc }: MenuMutationInput) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: getMenuCategoriesQueryOptions({ branchId, trpc }).queryKey }),
    queryClient.invalidateQueries({ queryKey: getMenuDishesQueryOptions({ branchId, trpc }).queryKey }),
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
