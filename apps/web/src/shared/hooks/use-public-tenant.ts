import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo } from "react";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { PublicTenant } from "~/shared/types/public-tenant";

const FALLBACK_HERO_PHOTO_URL = "https://picsum.photos/seed/qmenut-branch/800/600";

interface PublicTenantState {
  isLoading: boolean;
  tenant: PublicTenant | null;
}

/**
 * Tenant identity for the public pages: branch data comes from the shared `menu.publicData`
 * query (same cache entry the menu uses); branding comes from the KV theme config resolved by
 * the root route. `tenant` is `null` when the host doesn't match any seeded branch.
 */
export function usePublicTenant(): PublicTenantState {
  const trpc = useAppTrpc();
  const { host, theme } = useTenantContext();
  const { locale } = useRouteContext({ from: "/{-$locale}" });
  const { data } = useSuspenseQuery(getPublicMenuQueryOptions({ host, locale, trpc }));

  const tenant = useMemo<PublicTenant | null>(() => {
    if (!data) {
      return null;
    }

    return {
      heroPhotoUrl: data.branch.photos[0]?.url ?? FALLBACK_HERO_PHOTO_URL,
      primary: theme.primary,
      secondary: theme.secondary,
      template: theme.template,
      tenantName: data.branch.name,
      tenantTagline: theme.tagline ?? "",
    };
  }, [data, theme]);

  return {
    isLoading: false,
    tenant,
  };
}
