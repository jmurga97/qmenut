/** Retry a failed responsive candidate once using the original, canonical image. */
export function restorePhotoFallback(image: HTMLImageElement, canonicalUrl?: string): void {
  if (!canonicalUrl || (image.getAttribute("src") === canonicalUrl && !image.hasAttribute("srcset"))) return;

  image.removeAttribute("srcset");
  image.removeAttribute("sizes");
  image.src = canonicalUrl;
}
