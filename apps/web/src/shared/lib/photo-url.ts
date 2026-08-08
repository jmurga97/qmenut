const UNSPLASH_IMAGE_HOST = "images.unsplash.com";
const IMAGE_DPR = 2;

/** Rewrites supported image URLs to the width of their rendered CSS box at 2x DPR. */
export function photoUrl(url: string | undefined, cssWidth: number): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== UNSPLASH_IMAGE_HOST) return url;

    parsed.searchParams.set("w", String(Math.round(cssWidth * IMAGE_DPR)));
    return parsed.href;
  } catch {
    return url;
  }
}
