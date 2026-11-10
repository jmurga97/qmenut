import { TEMPLATES } from "@qmenut/ui/theme/presets";

import { pickFeaturedDish } from "~/features/menu/mappers/pick-featured-dish";
import { buildHreflangAlternates } from "~/features/menu/seo/build-hreflang-alternates";
import { truncateLabel } from "~/lib/app-label";
import { FALLBACK_HERO_PHOTO_URL, HERO_PHOTO_LAYOUT, getPhotoLayout } from "~/shared/lib/photo-layout";
import { responsivePhotoSource } from "~/shared/lib/photo-url";

import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import type { i18n as I18nInstance } from "i18next";
import type { PublicMenuData } from "~/shared/public-menu/public-menu-types";
import type { TenantContext } from "~/shared/tenant/tenant-context";

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
  noIndex?: boolean;
  path: string;
  preloadLcpImage?: boolean;
  titleKey?: string;
}

const DESCRIPTION_MAX_LENGTH = 155;

// Open Graph wants ll_CC; one region per bundled UI language is enough for link previews.
const OPEN_GRAPH_LOCALES: Record<string, string> = {
  ca: "ca_ES",
  de: "de_DE",
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  gl: "gl_ES",
  it: "it_IT",
  nl: "nl_NL",
  pl: "pl_PL",
  pt: "pt_PT",
  ru: "ru_RU",
  uk: "uk_UA",
  zh: "zh_CN",
};

function toOpenGraphLocale(locale: string): string {
  const [language = "", region] = locale.toLowerCase().split(/[-_]/);
  if (region?.length === 2) return `${language}_${region.toUpperCase()}`;

  return OPEN_GRAPH_LOCALES[language] ?? language;
}

// Built from the tagline and category names, never from category descriptions: link previews
// would show e.g. a category's opening hours as if they were the restaurant's.
function buildMenuDescription(data: PublicMenuData, i18n: I18nInstance): string {
  const categories = data.categories.map((category) => category.name).join(", ");
  const summary = categories
    ? i18n.t("menu.seoDescription", { name: data.branch.name, categories })
    : [data.branch.name, data.branch.address].filter(Boolean).join(" – ");
  const tagline = data.tagline.trim();

  return truncateLabel(tagline ? `${tagline}. ${summary}` : summary, DESCRIPTION_MAX_LENGTH);
}

function getLcpPhotoSource({
  data,
  preload,
  theme,
}: {
  data: PublicMenuData;
  preload: boolean;
  theme: QmTenantThemeConfig;
}) {
  if (!preload || theme.template === "her") return;

  const headerMode = TEMPLATES[theme.template].photoMode;
  if (headerMode === "hero" || headerMode === "heroxl") {
    const photo = data.branch.photos[0];
    return responsivePhotoSource({
      canonicalUrl: photo?.url ?? FALLBACK_HERO_PHOTO_URL,
      variants: photo?.variants,
      ...HERO_PHOTO_LAYOUT,
    });
  }

  if (!theme.showMenuPhotos) return;
  const dish = pickFeaturedDish(data);
  return responsivePhotoSource({
    canonicalUrl: dish?.imageUrl ?? undefined,
    variants: dish?.variants,
    ...getPhotoLayout({ template: theme.template, theme }).featured,
  });
}

function getPrimaryPhotoOrigin(photoUrl: string | undefined, origin: string): string | undefined {
  if (!photoUrl) return undefined;

  try {
    return new URL(photoUrl, origin).origin;
  } catch {
    return undefined;
  }
}

export function buildPageHead({
  allowedLocales,
  descriptionKey,
  image,
  jsonLd,
  loaderData,
  match,
  noIndex = false,
  path,
  preloadLcpImage = false,
  titleKey,
}: BuildPageHeadInput) {
  const host = match.context.tenant.host;

  if (!loaderData) {
    return { meta: [{ title: host }, { name: "robots", content: "noindex" }] };
  }

  const origin = `https://${host}`;
  // The router redirects trailing slashes away (`/en/` → `/en`); the canonical must not point at a redirect.
  const canonicalPath = match.pathname === "/" ? "/" : match.pathname.replace(/\/$/, "");
  const canonicalUrl = `${origin}${canonicalPath}`;
  const translationValues = {
    address: loaderData.branch.address ? `: ${loaderData.branch.address}` : "",
    name: loaderData.branch.name,
  };
  const title = titleKey ? match.context.i18n.t(titleKey, translationValues) : loaderData.branch.name;
  const description = descriptionKey
    ? match.context.i18n.t(descriptionKey, translationValues)
    : buildMenuDescription(loaderData, match.context.i18n);
  const effectiveLocale = match.context.effectiveLocale ?? loaderData.language.effective;
  const ogLocale = toOpenGraphLocale(effectiveLocale);
  const resolvedImage = new URL(
    image ?? loaderData.branch.photos[0]?.url ?? loaderData.branch.logoUrl ?? "/og-default.png",
    origin,
  ).href;
  const lcpSource = getLcpPhotoSource({
    data: loaderData,
    preload: preloadLcpImage,
    theme: match.context.tenant.theme,
  });
  const primaryPhotoOrigin = getPrimaryPhotoOrigin(lcpSource?.src, origin);

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
      // No og:locale:alternate: HeadContent dedupes meta by property, so only one would survive.
      { property: "og:locale", content: ogLocale },
      ...(jsonLd ? [{ "script:ld+json": jsonLd }] : []),
      ...(noIndex ? [{ name: "robots", content: "noindex,follow" }] : []),
    ],
    links: [
      { rel: "canonical", href: canonicalUrl },
      ...(primaryPhotoOrigin
        ? [{ rel: "preconnect", href: primaryPhotoOrigin, crossOrigin: "anonymous" as const }]
        : []),
      ...(lcpSource
        ? [
            {
              rel: "preload",
              as: "image",
              href: lcpSource.src,
              imageSrcSet: lcpSource.srcSet,
              imageSizes: lcpSource.sizes,
              fetchPriority: "high" as const,
            },
          ]
        : []),
      ...buildHreflangAlternates({
        allowedLocales,
        language: loaderData.language,
        origin,
        path,
      }).map(({ hreflang, href }) => ({ rel: "alternate", hrefLang: hreflang, href })),
    ],
  };
}
