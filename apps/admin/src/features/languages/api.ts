import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

interface ApiContext {
  queryClient: QueryClient;
  trpc: TrpcOptionsProxy;
}
export function getLanguagesQueryOptions({ trpc }: Pick<ApiContext, "trpc">) {
  return trpc.admin.languages.list.queryOptions();
}
export function getLanguageCatalogQueryOptions({ trpc }: Pick<ApiContext, "trpc">) {
  return trpc.admin.languages.catalog.queryOptions();
}
export function getLanguageMutationOptions(context: ApiContext) {
  const onSuccess = () =>
    context.queryClient.invalidateQueries({ queryKey: getLanguagesQueryOptions(context).queryKey });
  return {
    add: context.trpc.admin.languages.add.mutationOptions({ onSuccess }),
    remove: context.trpc.admin.languages.remove.mutationOptions({ onSuccess }),
    translate: context.trpc.admin.translations.translateAll.mutationOptions(),
  };
}
