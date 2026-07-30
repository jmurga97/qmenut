import { can } from "@qmenut/permissions";
import { useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";

import type { Permission } from "@qmenut/permissions";

export function useCan(permission: Permission): boolean {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  return can(tenant.roleCode, permission);
}
