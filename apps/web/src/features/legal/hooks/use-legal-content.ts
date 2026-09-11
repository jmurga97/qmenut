import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";
import { getPublicMenuQueryOptions } from "~/shared/public-menu/public-menu-query-options";

import type { PublicMenuData } from "~/shared/public-menu/public-menu-types";

/**
 * Legal content from the shared `menu.publicData` cache entry used by the public pages.
 * `null` is returned when the host has no tenant.
 */
export function useLegalContent(): Pick<PublicMenuData, "branch" | "countryCode" | "legal"> | null {
  const trpc = useAppTrpc();
  const { host } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  return data ? { branch: data.branch, countryCode: data.countryCode, legal: data.legal } : null;
}
