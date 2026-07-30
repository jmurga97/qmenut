import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { useEffect, useMemo } from "react";

import { FONT_CSS_URLS, resolveTenantFontIds } from "~/app/fonts/font-css";
import { PublicBottomNav } from "~/shared/components/public-bottom-nav";
import { useTenantContext } from "~/shared/hooks/use-tenant-context";

import type { QmFontId } from "@qmenut/ui/theme/font-catalog";
import type { QmTemplateName } from "@qmenut/ui/theme/presets";
import type { ReactNode } from "react";
import type { PublicTenant } from "~/shared/types/public-tenant";

interface PublicPageShellProps {
  children: ReactNode;
  overlay?: ReactNode;
  template: QmTemplateName;
  tenant: PublicTenant;
}

export function PublicPageShell({ children, overlay, template, tenant }: PublicPageShellProps) {
  const { theme } = useTenantContext();

  const themeVars = useMemo(() => {
    // KV preset overrides only apply while the tenant's own template is active; switching
    // templates (dev switcher) falls back to that template's stock preset.
    const overrides = template === theme.template ? theme : {};

    return buildQmThemeVars({
      ...overrides,
      template,
      primary: tenant.primary,
      secondary: tenant.secondary,
    });
  }, [template, tenant.primary, tenant.secondary, theme]);

  const fontIds = useMemo(() => {
    const activeTheme = template === theme.template ? theme : { template };
    const { heading, body } = resolveTenantFontIds(activeTheme);

    return [...new Set([heading, body])] as QmFontId[];
  }, [template, theme]);

  useEffect(() => {
    for (const fontId of fontIds) {
      const href = FONT_CSS_URLS[fontId];
      const absoluteHref = new URL(href, document.baseURI).href;
      const alreadyLoaded = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].some(
        (link) => link.href === absoluteHref,
      );

      if (alreadyLoaded) {
        continue;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      // Cloudflare's worker DOM types expose a narrower `append` overload than the browser DOM.
      // eslint-disable-next-line unicorn/prefer-dom-node-append -- appendChild is correctly typed in the worker build.
      document.head.appendChild(link);
    }
  }, [fontIds]);

  return (
    <div className="home-shell" style={themeVars}>
      <div className="home-column">
        {children}
        <PublicBottomNav />
      </div>
      {overlay}
    </div>
  );
}
