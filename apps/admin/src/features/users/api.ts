import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

interface ApiContext {
  queryClient: QueryClient;
  trpc: TrpcOptionsProxy;
}

export function getUsersQueryOptions({ trpc }: Pick<ApiContext, "trpc">) {
  return trpc.admin.users.list.queryOptions();
}

export function getUserMutationOptions({ queryClient, trpc }: ApiContext) {
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: getUsersQueryOptions({ trpc }).queryKey });
  return {
    create: trpc.admin.users.create.mutationOptions({ onSuccess }),
    resendInvite: trpc.admin.users.resendInvite.mutationOptions({ onSuccess }),
    setActive: trpc.admin.users.setActive.mutationOptions({ onSuccess }),
    updateRole: trpc.admin.users.updateRole.mutationOptions({ onSuccess }),
  };
}
