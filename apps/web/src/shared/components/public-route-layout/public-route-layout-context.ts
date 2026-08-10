import { createContext, useContext } from "react";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";
import type { RefObject } from "react";
import type { PublicTenant } from "~/shared/types/public-tenant";

export interface PublicRouteLayoutContextValue {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  template: QmTemplateName;
  tenant: PublicTenant;
}

export const PublicRouteLayoutContext = createContext<PublicRouteLayoutContextValue | null>(null);

export function usePublicRouteLayout(): PublicRouteLayoutContextValue {
  const context = useContext(PublicRouteLayoutContext);

  if (!context) {
    throw new Error("usePublicRouteLayout must be used inside the public route layout");
  }

  return context;
}
