import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";

import type { i18n as I18nInstance } from "i18next";
import type { PublicMenuData } from "~/features/menu/api/public-menu-types";
import type { TenantContext } from "~/server/tenant-theme";

interface PageHeadMatch {
  context: {
    effectiveLocale?: string;
    i18n: I18nInstance;
    tenant: TenantContext;
  };
  pathname: string;
}

interface BuildPageHeadInput {
  allowedLocales?: readonly string[];
  descriptionKey?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
  loaderData: PublicMenuData | null | undefined;
  match: PageHeadMatch;
  path: string;
  titleKey?: string;
}

const OPEN_GRAPH_LOCALES: Record<string, string> = {
  en: "en_US",
  es: "es_ES",
};

function toOpenGraphLocale(locale: string): string {
  const normalized = locale.replaceAll("-", "_");
  const base = normalized.split("_", 1)[0]?.toLowerCase() ?? normalized;

  return OPEN_GRAPH_LOCALES[base] ?? normalized;
}

function buildMenuDescription(data: PublicMenuData): string {
  const firstDescription = data.categories
    .flatMap((category) => [category.description, ...category.dishes.map((dish) => dish.description)])
    .find((description): description is string => Boolean(description?.trim()));

  if (firstDescription) {
    return firstDescription.slice(0, 155);
  }

  return data.branch.address ? `${data.branch.name} – ${data.branch.address}` : `Carta de ${data.branch.name}`;
}

export function buildPageHead({
  allowedLocales,
  descriptionKey,
  image,
  jsonLd,
  loaderData,
  match,
  path,
  titleKey,
}: BuildPageHeadInput) {
  const host = match.context.tenant.host;

  if (!loaderData) {
    return { meta: [{ title: host }, { name: "robots", content: "noindex" }] };
  }

  const origin = `https://${host}`;
  const canonicalUrl = `${origin}${match.pathname}`;
  const translationValues = {
    address: loaderData.branch.address ? `: ${loaderData.branch.address}` : "",
    name: loaderData.branch.name,
  };
  const title = titleKey ? match.context.i18n.t(titleKey, translationValues) : loaderData.branch.name;
  const description = descriptionKey
    ? match.context.i18n.t(descriptionKey, translationValues)
    : buildMenuDescription(loaderData);
  const effectiveLocale = match.context.effectiveLocale ?? loaderData.language.effective;
  const ogLocale = toOpenGraphLocale(effectiveLocale);
  const alternateLocales = loaderData.language.available
    .map((option) => toOpenGraphLocale(option.code))
    .filter((locale) => locale !== ogLocale);
  const resolvedImage = new URL(image ?? loaderData.branch.photos[0]?.url ?? "/og-default.png", origin).href;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonicalUrl },
      { property: "og:image", content: resolvedImage },
      { property: "og:site_name", content: loaderData.branch.name },
      { property: "og:locale", content: ogLocale },
      ...alternateLocales.map((locale) => ({ property: "og:locale:alternate", content: locale })),
      ...(jsonLd ? [{ "script:ld+json": jsonLd }] : []),
    ],
    links: [
      { rel: "canonical", href: canonicalUrl },
      ...buildHreflangAlternates({
        allowedLocales,
        language: loaderData.language,
        origin,
        path,
      }).map(({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href })),
    ],
  };
}
