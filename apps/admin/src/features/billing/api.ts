import type { TrpcOptionsProxy } from "~/lib/trpc";

export function getBillingOverviewQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.billing.overview.queryOptions();
}
function redirectToBillingUrl({ url }: { url: string }) {
  window.location.assign(url);
}
export function getCheckoutMutationOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.billing.checkout.mutationOptions({ onSuccess: redirectToBillingUrl });
}
export function getPortalMutationOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.admin.billing.portal.mutationOptions({ onSuccess: redirectToBillingUrl });
}
