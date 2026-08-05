import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { PublicMenuData } from "~/features/menu/api/public-menu-types";

/**
 * Legal content from the shared `menu.publicData` cache entry used by the public pages.
 * `null` is returned when the host has no tenant.
 */
export function useLegalContent(): Pick<PublicMenuData, "branch" | "legal"> | null {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  return data ? { branch: data.branch, legal: data.legal } : null;
}
