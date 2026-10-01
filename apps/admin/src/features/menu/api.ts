import type { QueryClient } from "@tanstack/react-query";
import type { RouterOutputs, TrpcOptionsProxy } from "~/lib/trpc";

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
// Editors query in the base language (languageCode undefined) while lists key on the selected one, so match by path.
function invalidateMenu({ queryClient, trpc }: MenuMutationInput) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: trpc.admin.menu.categories.list.pathKey() }),
    queryClient.invalidateQueries({ queryKey: trpc.admin.menu.dishes.list.pathKey() }),
    // The list | editor layout reopens dishes without leaving the page, so cached details must not go stale.
    queryClient.invalidateQueries({ queryKey: trpc.admin.menu.dishes.detail.pathKey() }),
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
    // Lists only: refetching the detail of the dish just deleted would throw NOT_FOUND in the still-mounted editor.
    remove: input.trpc.admin.menu.dishes.remove.mutationOptions({
      onSuccess: () => input.queryClient.invalidateQueries({ queryKey: input.trpc.admin.menu.dishes.list.pathKey() }),
    }),
    relations: input.trpc.admin.menu.dishes.saveRelations.mutationOptions({ onSuccess: () => invalidateMenu(input) }),
    update: input.trpc.admin.menu.dishes.update.mutationOptions(),
  };
}
export function getIngredientMutationOptions({
  queryClient,
  trpc,
}: {
  queryClient: QueryClient;
  trpc: TrpcOptionsProxy;
}) {
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.admin.menu.taxonomy.ingredients.pathKey() });
  return {
    create: trpc.admin.menu.taxonomy.createIngredient.mutationOptions({ onSuccess: invalidate }),
    remove: trpc.admin.menu.taxonomy.removeIngredient.mutationOptions({ onSuccess: invalidate }),
    update: trpc.admin.menu.taxonomy.updateIngredient.mutationOptions({ onSuccess: invalidate }),
  };
}
type DishList = RouterOutputs["admin"]["menu"]["dishes"]["list"];

// Optimistic: the switch flips at once in every cached dish list; the refetch on settle restores the truth on error.
// One scope runs rapid toggles in click order, and only the last one to settle refetches, so a stale list never
// overwrites a flip that is still queued.
export function getDishAvailabilityMutationOptions(input: MenuMutationInput) {
  const { queryClient, trpc } = input;
  const listKey = trpc.admin.menu.dishes.list.pathKey();
  const mutationKey = trpc.admin.menu.dishes.setAvailability.mutationKey();
  return trpc.admin.menu.dishes.setAvailability.mutationOptions({
    scope: { id: "dish-availability" },
    onMutate: async ({ dishId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      queryClient.setQueriesData<DishList>({ queryKey: listKey }, (dishes) =>
        dishes?.map((dish) => (dish.id === dishId ? { ...dish, isActive } : dish)),
      );
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      return queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}
type CategoryList = RouterOutputs["admin"]["menu"]["categories"]["list"];

// Optimistic like availability: cached lists of this branch reorder at once, one scope keeps rapid moves in order,
// and only the last move to settle refetches.
export function getCategoryReorderMutationOptions(input: MenuMutationInput) {
  const { queryClient, trpc } = input;
  const listKey = trpc.admin.menu.categories.list.pathKey();
  const mutationKey = trpc.admin.menu.categories.reorder.mutationKey();
  return trpc.admin.menu.categories.reorder.mutationOptions({
    scope: { id: "category-reorder" },
    onMutate: async ({ categoryIds }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const positions = new Map(categoryIds.map((id, position) => [id, position]));
      queryClient.setQueriesData<CategoryList>({ queryKey: listKey }, (categories) => {
        // Lists of other branches share the path key; leave them untouched.
        if (!categories?.every(({ id }) => positions.has(id))) return categories;
        return categories
          .map((category) => ({ ...category, position: positions.get(category.id) ?? category.position }))
          .toSorted((a, b) => a.position - b.position);
      });
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      return queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}
