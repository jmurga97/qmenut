import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { useMemo } from "react";

import { useTenantContext } from "~/shared/hooks/use-tenant-context";

export function PublicPageSkeleton() {
  const rowCount = 5;
  const { theme } = useTenantContext();
  const themeVars = useMemo(
    () =>
      buildQmThemeVars({
        ...theme,
        template: theme.template,
        primary: theme.primary,
        secondary: theme.secondary,
      }),
    [theme],
  );

  return (
    <div className="home-shell" data-template={theme.template} style={themeVars}>
      <div className="home-column">
        <div className="hs-header">
          <div className="hs-bar hs-bar--topbar" />
          <div className="hs-bar hs-bar--title" />
          <div className="hs-bar hs-bar--subtitle" />
        </div>
        <div className="home-scroll">
          <div className="hs-featured">
            <div className="hs-block hs-block--photo" />
            <div className="hs-bar hs-bar--name" />
            <div className="hs-bar hs-bar--desc" />
          </div>
          <div className="hs-rows">
            {Array.from({ length: rowCount }, (_, index) => (
              <div className="hs-row" key={index}>
                <div className="hs-bar hs-bar--row-name" />
                <div className="hs-bar hs-bar--row-desc" />
              </div>
            ))}
          </div>
        </div>
        <div className="hs-nav" />
      </div>
    </div>
  );
}
