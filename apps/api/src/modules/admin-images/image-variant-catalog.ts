import { isQmenutMediaUrl, isQmenutMediaVariantUrl } from "./media-url";

import type { VerifiedImageManifest } from "./image-worker.client";
import type { ImageVariantCatalogEntry } from "@qmenut/db/repositories/image-variants.repository";

/** Converts the worker's immutable manifest into the public lookup rows used by menu queries. */
function buildManifestEntries(manifest: VerifiedImageManifest): ImageVariantCatalogEntry[] {
  const main = manifest.variants.main;

  if (!main?.publicUrl || !isQmenutMediaUrl(main.publicUrl)) {
    return [];
  }

  const canonicalUrl = main.publicUrl;

  return Object.values(manifest.variants)
    .filter(
      (variant) =>
        variant.publicUrl && isQmenutMediaVariantUrl(variant.publicUrl) && variant.width > 0 && variant.height > 0,
    )
    .map((variant) => ({
      canonicalUrl,
      format: variant.contentType,
      height: variant.height,
      url: variant.publicUrl as string,
      width: variant.width,
    }));
}

export function buildImageVariantCatalogEntries(manifests: VerifiedImageManifest[]): ImageVariantCatalogEntry[] {
  const entries = new Map<string, ImageVariantCatalogEntry>();
  const manifestEntries = manifests.flatMap((manifest) => buildManifestEntries(manifest));

  for (const entry of manifestEntries) {
    entries.set(`${entry.canonicalUrl}:${entry.width}:${entry.format}`, entry);
  }

  return entries.values().toArray();
}
