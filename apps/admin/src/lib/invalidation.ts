import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "@lib/trpc";

export async function invalidateMenu(queryClient: QueryClient, trpc: TrpcOptionsProxy, branchId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: trpc.admin.menu.categories.list.queryKey({ branchId }) }),
    queryClient.invalidateQueries({ queryKey: trpc.admin.menu.dishes.list.queryKey({ branchId }) }),
  ]);
}

export async function invalidateLanguages(queryClient: QueryClient, trpc: TrpcOptionsProxy) {
  await queryClient.invalidateQueries({ queryKey: trpc.admin.languages.list.queryKey() });
}

export async function invalidateTranslations(
  queryClient: QueryClient,
  trpc: TrpcOptionsProxy,
  branchId: string,
  languageCode: string,
) {
  await queryClient.invalidateQueries({ queryKey: trpc.admin.translations.list.queryKey({ branchId, languageCode }) });
}
