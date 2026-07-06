import { useRouteContext } from "@tanstack/react-router";

import type { TenantContext } from "~/server/tenant-theme";

export function useTenantContext(): TenantContext {
  return useRouteContext({
    from: "__root__",
    select: (context) => (context as { tenant: TenantContext }).tenant,
  });
}
