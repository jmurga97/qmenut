import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";

import {
  getBillingOverviewQueryOptions,
  getChangePlanMutationOptions,
  getCheckoutMutationOptions,
  getConnectStripeMutationOptions,
  getPaymentsAccountQueryOptions,
  getPortalMutationOptions,
} from "../api";

import type { PlanCode } from "@qmenut/permissions";

export function useBillingController() {
  const { data: overview } = useSuspenseQuery(getBillingOverviewQueryOptions({ trpc }));
  const checkout = useMutation(getCheckoutMutationOptions({ trpc }));
  const changePlan = useMutation(getChangePlanMutationOptions({ trpc }));
  const portal = useMutation(getPortalMutationOptions({ trpc }));
  return {
    overview,
    busy: checkout.isPending || changePlan.isPending || portal.isPending,
    changePlan: (branchId: string, planCode: PlanCode) => changePlan.mutate({ branchId, planCode }),
    openPortal: () => portal.mutate(),
    subscribe: (branchId: string, planCode: PlanCode) => checkout.mutate({ branchId, planCode }),
  };
}

export function usePaymentsController() {
  const { data: account } = useSuspenseQuery(getPaymentsAccountQueryOptions({ trpc }));
  const connect = useMutation(getConnectStripeMutationOptions({ trpc }));
  return {
    account,
    busy: connect.isPending,
    connect: () => connect.mutate(),
  };
}
