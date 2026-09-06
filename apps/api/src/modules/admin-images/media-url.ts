const QMENUT_MEDIA_ORIGIN = "https://media.qmenut.app";

export function isQmenutMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === QMENUT_MEDIA_ORIGIN && url.pathname.endsWith("/main.webp");
  } catch {
    return false;
  }
}

export function isQmenutMediaVariantUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === QMENUT_MEDIA_ORIGIN && url.pathname.endsWith(".webp");
  } catch {
    return false;
  }
}
