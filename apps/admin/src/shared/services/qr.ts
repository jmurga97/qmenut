import QRCode from "qrcode";

export const QR_OPTIONS = { errorCorrectionLevel: "Q", margin: 4 } as const;
export const QR_PREVIEW_SIZE = 240;

export type QrTarget = "menu" | "reviews" | "loyalty";

export interface BuildQrUrlInput {
  domain: string;
  googlePlaceId?: string | null;
  target: QrTarget;
}

/**
 * `utm_source=qr` marca la visita como procedente del QR físico (PostHog la atribuye a sala).
 * `loyalty` apunta a `/puntos`, donde la carta abre el canje solo si la visita viene del QR.
 */
export function buildQrUrl({ domain, googlePlaceId, target }: BuildQrUrlInput): string {
  if (target === "reviews") {
    if (!googlePlaceId) throw new Error("Conecta una ficha de Google antes de generar este QR.");
    const url = new URL("https://search.google.com/local/writereview");
    url.searchParams.set("placeid", googlePlaceId);
    return url.href;
  }
  const path = target === "loyalty" ? "/puntos" : "/";
  return `https://${domain}${path}?utm_source=qr`;
}
export function renderQrPreview(canvas: HTMLCanvasElement, url: string) {
  return QRCode.toCanvas(canvas, url, { ...QR_OPTIONS, width: QR_PREVIEW_SIZE });
}
export function renderQrSvg(url: string) {
  return QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
}
