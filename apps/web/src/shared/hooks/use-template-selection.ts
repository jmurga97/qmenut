import { useEffect, useState } from "react";

import type { QmTemplateName } from "@qmenut/ui";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface TemplateSelectionState {
  setTemplate: (template: QmTemplateName) => void;
  template: QmTemplateName;
}

export function useTemplateSelection(tenant: PublicTenant | null): TemplateSelectionState {
  // Initialize from the tenant so SSR already renders the tenant's template (effects don't run
  // on the server); the effect only covers later tenant changes.
  const [template, setTemplate] = useState<QmTemplateName>(tenant?.template ?? "her");

  useEffect(() => {
    if (!tenant) {
      return;
    }

    setTemplate(tenant.template);
  }, [tenant]);

  return {
    setTemplate,
    template,
  };
}
