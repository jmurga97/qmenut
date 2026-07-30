import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";

import { getBillingOverviewQueryOptions, getCheckoutMutationOptions, getPortalMutationOptions } from "../api";

export function useBillingController() {
  const { data: overview } = useSuspenseQuery(getBillingOverviewQueryOptions({ trpc }));
  const checkout = useMutation(getCheckoutMutationOptions({ trpc }));
  const portal = useMutation(getPortalMutationOptions({ trpc }));
  return {
    overview,
    busy: checkout.isPending || portal.isPending,
    error: checkout.error ?? portal.error,
    openPortal: () => portal.mutate(),
    subscribe: (branchId: string, planCode: "basic" | "business") => checkout.mutate({ branchId, planCode }),
  };
}
