import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

type ApiContext = { trpc: TrpcOptionsProxy };
type MutationContext = ApiContext & { queryClient: QueryClient };

export const BADGE_POLL_INTERVAL_MS = 60_000;

export function getNotificationsQueryOptions({ branchId, trpc }: ApiContext & { branchId: string }) {
  return trpc.admin.notifications.list.queryOptions({ branchId });
}
export function getNotificationBadgeQueryOptions({ branchId, trpc }: ApiContext & { branchId: string }) {
  return trpc.admin.notifications.badge.queryOptions({ branchId });
}
export function getPushConfigQueryOptions({ trpc }: ApiContext) {
  return trpc.admin.notifications.pushConfig.queryOptions(undefined, { staleTime: Number.POSITIVE_INFINITY });
}
export function getPushDeviceQueryOptions({ endpoint, trpc }: ApiContext & { endpoint: string }) {
  return trpc.admin.notifications.device.queryOptions({ endpoint });
}
export function invalidateNotifications({ queryClient, trpc }: MutationContext) {
  return queryClient.invalidateQueries({ queryKey: trpc.admin.notifications.pathKey() });
}
export function getNotificationMutationOptions(context: MutationContext) {
  const { trpc } = context;
  const options = { onSettled: () => invalidateNotifications(context) };
  return {
    markAllRead: trpc.admin.notifications.markAllRead.mutationOptions(options),
    markRead: trpc.admin.notifications.markRead.mutationOptions(options),
    removeDevice: trpc.admin.notifications.removeDevice.mutationOptions(options),
    saveDevice: trpc.admin.notifications.saveDevice.mutationOptions(options),
  };
}
