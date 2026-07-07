import { Outlet, createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { DEFAULT_LOCALE, chromeLocale } from "~/lib/i18n/create-i18n";
import { AnalyticsBootstrap } from "~/shared/components/analytics-bootstrap";
import { LocaleDetector } from "~/shared/components/locale-detector";

const LOCALE_PATTERN = /^[a-z]{2,3}(-[a-z]{2,4})?$/i;

export interface LocaleLanguageOption {
  code: string;
  isDefault: boolean;
}

export interface LocaleRouteContext {
  availableLanguages: LocaleLanguageOption[];
  defaultLanguage: string;
  effectiveLocale: string;
  locale: string | undefined;
}

export const Route = createFileRoute("/{-$locale}")({
  beforeLoad: async ({ context, location, params }): Promise<LocaleRouteContext> => {
    const requested = params.locale?.toLowerCase();

    if (requested !== undefined && !LOCALE_PATTERN.test(requested)) {
      throw notFound();
    }

    const data = await context.queryClient.ensureQueryData(
      getPublicMenuQueryOptions({ host: context.tenant.host, locale: requested, trpc: context.trpc }),
    );
    const language = data?.language;

    // Prefix doesn't map to an active language for this tenant — fall back to the
    // unprefixed (default-language) URL rather than serving a mismatched locale.
    if (requested !== undefined && language && language.effective !== requested) {
      const rest = location.pathname.replace(new RegExp(`^/${requested}`, "i"), "");

      throw redirect({ href: rest || "/" });
    }

    const effectiveLocale = language?.effective ?? requested ?? DEFAULT_LOCALE;

    if (context.i18n.language !== chromeLocale(effectiveLocale)) {
      await context.i18n.changeLanguage(chromeLocale(effectiveLocale));
    }

    return {
      availableLanguages: language?.available ?? [],
      defaultLanguage: language?.default ?? DEFAULT_LOCALE,
      effectiveLocale,
      locale: requested,
    };
  },
  component: LocaleLayout,
});

function LocaleLayout() {
  return (
    <>
      <Outlet />
      <LocaleDetector />
      <AnalyticsBootstrap />
    </>
  );
}
