import { applyQmTheme } from "@qmenut/ui";
import { useLayoutEffect, useRef } from "react";

import type { QmTemplateName } from "@qmenut/ui";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface QmThemeInput {
  template: QmTemplateName;
  tenant: PublicTenant;
}

export function useQmTheme({ template, tenant }: QmThemeInput) {
  const themeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!themeRef.current) {
      return;
    }

    applyQmTheme(themeRef.current, {
      template,
      primary: tenant.primary,
      secondary: tenant.secondary,
    });
  }, [template, tenant]);

  return themeRef;
}
