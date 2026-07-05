import { PublicBottomNav } from "~/shared/components/public-bottom-nav";
import { useQmTheme } from "~/shared/hooks/use-qm-theme";

import type { QmTemplateName } from "@qmenut/ui";
import type { ReactNode } from "react";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface PublicPageShellProps {
  children: ReactNode;
  overlay?: ReactNode;
  template: QmTemplateName;
  tenant: PublicTenant;
}

export function PublicPageShell({ children, overlay, template, tenant }: PublicPageShellProps) {
  const themeRef = useQmTheme({ template, tenant });

  return (
    <div ref={themeRef} className="home-shell">
      <div className="home-column">
        {children}
        <PublicBottomNav />
      </div>
      {overlay}
    </div>
  );
}
