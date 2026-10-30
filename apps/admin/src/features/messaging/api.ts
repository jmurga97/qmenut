import type { QueryClient } from "@tanstack/react-query";
import type { TrpcOptionsProxy } from "~/lib/trpc";

interface MessagingApiContext {
  queryClient: QueryClient;
  trpc: TrpcOptionsProxy;
}

// The worker pushes events through a queue; polling is enough for an internal console.
const REFRESH_MS = 5000;

export function getConversationsQueryOptions({ trpc }: Pick<MessagingApiContext, "trpc">) {
  return trpc.admin.messaging.conversations.queryOptions(undefined, { refetchInterval: REFRESH_MS });
}

export function getEventsQueryOptions({
  trpc,
  conversationId,
}: Pick<MessagingApiContext, "trpc"> & { conversationId: string }) {
  return trpc.admin.messaging.events.queryOptions({ conversationId }, { refetchInterval: REFRESH_MS });
}

function invalidateMessaging({ queryClient, trpc }: MessagingApiContext) {
  return queryClient.invalidateQueries({ queryKey: trpc.admin.messaging.pathKey() });
}

export function getSendMutationOptions(context: MessagingApiContext) {
  return context.trpc.admin.messaging.send.mutationOptions({ onSuccess: () => invalidateMessaging(context) });
}

export function getReplyMutationOptions(context: MessagingApiContext) {
  return context.trpc.admin.messaging.reply.mutationOptions({ onSuccess: () => invalidateMessaging(context) });
}
