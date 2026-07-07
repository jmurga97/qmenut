import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { PublicMenuData } from "~/features/menu/api/public-menu-types";

/**
 * Branch identity for interpolating the legal texts (same shared `menu.publicData`
 * cache entry the rest of the public pages use). `null` when the host has no tenant.
 */
export function useLegalBranch(): PublicMenuData["branch"] | null {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  return data?.branch ?? null;
}
