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
export function getTranslationsQueryOptions({
  branchId,
  languageCode,
  trpc,
}: Pick<ApiContext, "trpc"> & { branchId: string; languageCode: string }) {
  return trpc.admin.translations.list.queryOptions({ branchId, languageCode });
}
function invalidateLanguages({ queryClient, trpc }: ApiContext) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: getLanguagesQueryOptions({ trpc }).queryKey }),
    queryClient.invalidateQueries({ queryKey: trpc.admin.translations.pathKey() }),
  ]);
}
export function getLanguageMutationOptions(context: ApiContext) {
  const onSuccess = () => invalidateLanguages(context);
  return {
    active: context.trpc.admin.languages.setActive.mutationOptions({ onSuccess }),
    add: context.trpc.admin.languages.add.mutationOptions({ onSuccess }),
    remove: context.trpc.admin.languages.remove.mutationOptions({ onSuccess }),
    translate: context.trpc.admin.translations.translateAll.mutationOptions({ onSuccess }),
  };
}
export function getUpdateTranslationMutationOptions({
  branchId,
  languageCode,
  ...context
}: ApiContext & { branchId: string; languageCode: string }) {
  const queryKey = getTranslationsQueryOptions({ branchId, languageCode, trpc: context.trpc }).queryKey;
  return context.trpc.admin.translations.update.mutationOptions({
    onSuccess: () => context.queryClient.invalidateQueries({ queryKey }),
  });
}
