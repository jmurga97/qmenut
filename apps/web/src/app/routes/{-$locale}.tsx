import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { SHORT_NAME_MAX_LENGTH, truncateLabel } from "~/lib/app-label";
import { DEFAULT_LOCALE, chromeLocale } from "~/lib/i18n/create-i18n";
import { LOCALE_PATTERN } from "~/lib/i18n/locale-pattern";
import { AnalyticsBootstrap } from "~/shared/components/analytics-bootstrap";
import { LocaleDetector } from "~/shared/components/locale-detector";
import { PublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout";
import { DevTemplateSwitcher } from "~/shared/dev/dev-template-switcher";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";

export interface LocaleLanguageOption {
  code: string;
  isDefault: boolean;
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
}

function isQmTemplateName(value: unknown): value is QmTemplateName {
  return typeof value === "string" && Object.hasOwn(TEMPLATES, value);
}

export const Route = createFileRoute("/{-$locale}")({
  validateSearch: (search: Record<string, unknown>): LocaleSearch => ({
    utm_source: typeof search.utm_source === "string" ? search.utm_source : undefined,
    template: isQmTemplateName(search.template) ? search.template : undefined,
  }),
  beforeLoad: async ({ context, location, params, search }): Promise<LocaleRouteContext> => {
    const requested = params.locale?.toLowerCase();

    if (requested !== undefined && !LOCALE_PATTERN.test(requested)) {
      notFound({ throw: true });
    }

    const publicMenuOptions = getPublicMenuQueryOptions({
      host: context.tenant.host,
      locale: requested,
      trpc: context.trpc,
    });
    const data = await context.queryClient.ensureQueryData(publicMenuOptions);
    const language = data?.language;

    // Prefix doesn't map to an active language for this tenant — fall back to the
    // unprefixed (default-language) URL rather than serving a mismatched locale.
    if (requested !== undefined && language && language.effective !== requested) {
      const rest = location.pathname.replace(new RegExp(`^/${requested}`, "i"), "");

      redirect({ href: rest || "/", throw: true });
    }

    const effectiveLocale = language?.effective ?? requested ?? DEFAULT_LOCALE;

    if (context.i18n.language !== chromeLocale(effectiveLocale)) {
      await context.i18n.changeLanguage(chromeLocale(effectiveLocale));
    }

    return {
      availableLanguages: language?.available ?? [],
      branchName: data?.branch.name,
      defaultLanguage: language?.default ?? DEFAULT_LOCALE,
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

function LocaleLayout() {
  return (
    <>
      <PublicRouteLayout />
      <LocaleDetector />
      <AnalyticsBootstrap />
      <DevTemplateSwitcher />
    </>
  );
}
