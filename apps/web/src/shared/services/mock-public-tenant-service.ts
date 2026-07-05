import { MOCK_PUBLIC_TENANT } from "~/shared/mock/mock-public-tenant";

import type { PublicTenant } from "~/shared/types/public-tenant";

const MOCK_TENANT_DELAY_MS = 200;

export function getMockPublicTenant(): Promise<PublicTenant> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_PUBLIC_TENANT), MOCK_TENANT_DELAY_MS);
  });
}
