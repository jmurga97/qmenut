const UNSPLASH_IMAGE_HOST = "images.unsplash.com";
const RESPONSIVE_WIDTHS = [160, 430, 860] as const;

export interface ConfirmedPhotoVariant {
  format: string;
  height: number;
  url: string;
  width: number;
}

export interface ResponsivePhotoSource {
  sizes: string;
  src: string;
  srcSet?: string;
}

function isUnsplashUrl(url: string): boolean {
  try {
    return new URL(url).hostname === UNSPLASH_IMAGE_HOST;
  } catch {
    return false;
  }
}

function unsplashUrl(url: string, width: number): string {
  const parsed = new URL(url);
  parsed.searchParams.set("auto", "format");
  parsed.searchParams.set("q", "75");
  parsed.searchParams.set("w", String(width));
  return parsed.href;
}

function uniqueVariants(variants: ConfirmedPhotoVariant[] | undefined): ConfirmedPhotoVariant[] {
  return new Map(
    (variants ?? []).filter((variant) => variant.url && variant.width > 0).map((variant) => [variant.width, variant]),
  )
    .values()
    .toArray()
    .toSorted((a, b) => a.width - b.width);
}

/** Returns the smallest confirmed candidate that can cover the rendered CSS width. */
export function photoUrl(url: string | undefined, cssWidth: number): string | undefined {
  if (!url) return undefined;

  if (!isUnsplashUrl(url)) return url;

  return unsplashUrl(url, Math.max(1, Math.round(cssWidth * 2)));
}

export function responsivePhotoSource({
  canonicalUrl,
  cssWidth,
  sizes,
  variants,
}: {
  canonicalUrl: string | undefined;
  cssWidth: number;
  sizes: string;
  variants?: ConfirmedPhotoVariant[];
}): ResponsivePhotoSource | undefined {
  if (!canonicalUrl) return undefined;

  const candidates = isUnsplashUrl(canonicalUrl)
    ? RESPONSIVE_WIDTHS.map((width) => ({ url: unsplashUrl(canonicalUrl, width), width }))
    : uniqueVariants(variants).map(({ url, width }) => ({ url, width }));
  const selected = candidates.find((candidate) => candidate.width >= cssWidth) ?? candidates.at(-1);

  return {
    sizes,
    src: selected?.url ?? canonicalUrl,
    ...(candidates.length > 0 && { srcSet: candidates.map(({ url, width }) => `${url} ${width}w`).join(", ") }),
  };
}
