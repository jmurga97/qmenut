import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { SHOWCASE_VALUE } from "@qmenut/ui/theme/showcase";
import { QM_THEME_PREVIEW_SEARCH_VALUE } from "@qmenut/ui/theme/tenant-theme-config";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { MenuContentProvider } from "~/features/menu/hooks/menu-content-context";
import { ShowcaseMenuContent } from "~/features/showcase/showcase-menu-content";
import { ShowcaseProvider } from "~/features/showcase/showcase-provider";
import { SHORT_NAME_MAX_LENGTH, truncateLabel } from "~/lib/app-label";
import { chromeLocale } from "~/lib/i18n/create-i18n";
import { LOCALE_PATTERN, isLanguageTag } from "~/lib/i18n/locale-pattern";
import { AnalyticsBootstrap } from "~/shared/components/analytics-bootstrap";
import { LocaleDetector } from "~/shared/components/locale-detector";
import { PublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout";
import { TENANT_NOT_FOUND } from "~/shared/components/tenant-not-found";
import { DevTemplateSwitcher } from "~/shared/dev/dev-template-switcher";
import { getPublicMenuQueryOptions } from "~/shared/public-menu/public-menu-query-options";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";
import type { ReactNode } from "react";
import type { PublicMenuData } from "~/shared/public-menu/public-menu-types";

export interface LocaleLanguageOption {
  code: string;
  isDefault: boolean;
  label: string;
}

export interface LocaleRouteContext {
  availableLanguages: LocaleLanguageOption[];
  /** Home-screen label for the installed app; the root route cannot reach `menu.publicData`. */
  branchName: string | undefined;
  defaultLanguage: string;
  /** Dev-only `?template=` override, parsed and applied only when `import.meta.env.DEV`. */
  devTemplate: QmTemplateName | undefined;
  effectiveLocale: string;
  locale: string | undefined;
}

interface LocaleSearch {
  /**
   * Clave literal `?utm_source=qr` del QR impreso. Debe conservar su nombre original:
   * el router re-serializa las claves validadas en cada navegación y renombrarla
   * reescribiría la URL compartible de `/?utm_source=qr` a otra cosa.
   */
  utm_source?: string;
  template?: QmTemplateName;
  showcase?: typeof SHOWCASE_VALUE;
  /** The open dish sheet, so the back gesture closes it. Opened only on the client: the edge cache ignores search. */
  plato?: string;
  themePreview?: typeof QM_THEME_PREVIEW_SEARCH_VALUE;
}

/** Unknown or deactivated tenant: a real 404 so search engines drop it. */
function assertTenantFound(data: PublicMenuData | null): asserts data is PublicMenuData {
  if (!data) notFound({ data: TENANT_NOT_FOUND, throw: true });
}

function isQmTemplateName(value: unknown): value is QmTemplateName {
  return typeof value === "string" && Object.hasOwn(TEMPLATES, value);
}

export const Route = createFileRoute("/{-$locale}")({
  validateSearch: (search: Record<string, unknown>): LocaleSearch => ({
    utm_source: typeof search.utm_source === "string" ? search.utm_source : undefined,
    template: isQmTemplateName(search.template) ? search.template : undefined,
    showcase: search.showcase === SHOWCASE_VALUE ? SHOWCASE_VALUE : undefined,
    plato: typeof search.plato === "string" && search.plato ? search.plato : undefined,
    themePreview: search.themePreview === QM_THEME_PREVIEW_SEARCH_VALUE ? search.themePreview : undefined,
  }),
  beforeLoad: async ({ context, location, params, search }): Promise<LocaleRouteContext> => {
    const requested = params.locale?.toLowerCase();

    // Rejects path junk (`/cgi-bin`, `/wp-admin`) before it costs an uncached menu load.
    if (requested !== undefined && !(LOCALE_PATTERN.test(requested) && isLanguageTag(requested))) {
      notFound({ throw: true });
    }

    const publicMenuOptions = getPublicMenuQueryOptions({
      host: context.tenant.host,
      locale: requested,
      trpc: context.trpc,
    });
    const data = await context.queryClient.query({ ...publicMenuOptions, staleTime: "static" });

    assertTenantFound(data);
    const { language } = data;
    const isDefaultPrefix = requested === language.default;

    // `/es/…` on a Spanish-default tenant duplicates `/…`: redirect for good. A prefix that isn't
    // an active language falls back to the unprefixed URL (temporarily: it may be enabled later).
    if (requested !== undefined && (language.effective !== requested || isDefaultPrefix)) {
      const rest = location.pathname.replace(new RegExp(`^/${requested}`, "i"), "");
      const hash = location.hash ? `#${encodeURI(location.hash)}` : "";

      redirect({
        href: `${rest || "/"}${location.searchStr}${hash}`,
        statusCode: isDefaultPrefix ? 308 : 307,
        throw: true,
      });
    }

    const effectiveLocale = language.effective;

    if (context.i18n.language !== chromeLocale(effectiveLocale)) {
      await context.i18n.changeLanguage(chromeLocale(effectiveLocale));
    }

    return {
      availableLanguages: language.available,
      branchName: data.branch.name,
      defaultLanguage: language.default,
      devTemplate: import.meta.env.DEV ? search.template : undefined,
      effectiveLocale,
      locale: requested,
    };
  },
  head: ({ match }) => ({
    meta: match.context.branchName
      ? [
          {
            name: "apple-mobile-web-app-title",
            content: truncateLabel(match.context.branchName, SHORT_NAME_MAX_LENGTH),
          },
        ]
      : [],
  }),
  component: LocaleLayout,
});

function ShowcaseMenuContentProvider({ children }: { children: ReactNode }) {
  return (
    <MenuContentProvider>
      <ShowcaseMenuContent>{children}</ShowcaseMenuContent>
    </MenuContentProvider>
  );
}

function LocaleLayout() {
  const { showcase } = Route.useSearch();

  // The landing's demo frame: everything showcase lives in features/showcase, wrapped around the real menu.
  if (showcase) {
    return (
      <ShowcaseProvider>
        <PublicRouteLayout contentProvider={ShowcaseMenuContentProvider} />
      </ShowcaseProvider>
    );
  }

  return (
    <>
      <PublicRouteLayout contentProvider={MenuContentProvider} />
      <LocaleDetector />
      <AnalyticsBootstrap />
      <DevTemplateSwitcher />
    </>
  );
}
