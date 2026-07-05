import { useEffect, useState } from "react";

import { getMockPublicTenant } from "~/shared/services/mock-public-tenant-service";

import type { PublicTenant } from "~/shared/types/public-tenant";

interface PublicTenantState {
  isLoading: boolean;
  tenant: PublicTenant | null;
}

export function usePublicTenant(): PublicTenantState {
  const [tenant, setTenant] = useState<PublicTenant | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMockPublicTenant()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setTenant(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isLoading: tenant === null,
    tenant,
  };
}
