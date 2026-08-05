import { useRouteContext } from "@tanstack/react-router";

import type { PublicTenant } from "~/shared/types/public-tenant";

interface TemplateSelectionState {
  template: PublicTenant["template"];
}

export function useTemplateSelection(tenant: PublicTenant | null): TemplateSelectionState {
  // The dev-only `?template=` override (see the `{-$locale}` layout route and
  // `DevTemplateSwitcher`) takes priority over the tenant's own template when present.
  const devTemplate = useRouteContext({ from: "/{-$locale}", select: (context) => context.devTemplate });

  return {
    template: devTemplate ?? tenant?.template ?? "her",
  };
}
