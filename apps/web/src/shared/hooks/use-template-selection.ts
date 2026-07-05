import { useEffect, useState } from "react";

import type { QmTemplateName } from "@qmenut/ui";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface TemplateSelectionState {
  setTemplate: (template: QmTemplateName) => void;
  template: QmTemplateName;
}

export function useTemplateSelection(tenant: PublicTenant | null): TemplateSelectionState {
  const [template, setTemplate] = useState<QmTemplateName>("her");

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
