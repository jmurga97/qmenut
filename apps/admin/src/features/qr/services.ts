import QRCode from "qrcode";

const QR_OPTIONS = { errorCorrectionLevel: "Q", margin: 4 } as const;
export const QR_PREVIEW_SIZE = 240;

export type QrTarget = "menu" | "reviews" | "loyalty";

export interface BuildQrUrlInput {
  domain: string;
  googlePlaceId?: string | null;
  target: QrTarget;
}

export interface BuildQrFileBaseInput {
  domain: string;
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
export function buildQrFileBase({ domain, target }: BuildQrFileBaseInput): string {
  let prefix = "qr";
  if (target === "loyalty") prefix = "qr-fidelizacion";
  if (target === "reviews") prefix = "qr-resenas-google";
  return `${prefix}-${domain.replaceAll(".", "-")}`;
}
export function renderQrPreview(canvas: HTMLCanvasElement, url: string) {
  return QRCode.toCanvas(canvas, url, { ...QR_OPTIONS, width: QR_PREVIEW_SIZE });
}
export function renderQrSvg(url: string) {
  return QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
}
function downloadFile(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}
type DownloadQrInput = {
  fileBase: string;
  format: "png" | "svg";
  size: number;
  url: string;
};
export async function downloadQr({ fileBase, format, size, url }: DownloadQrInput) {
  if (format === "png") {
    downloadFile(await QRCode.toDataURL(url, { ...QR_OPTIONS, width: size }), `${fileBase}-${size}.png`);
    return;
  }
  const svg = await renderQrSvg(url);
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  downloadFile(objectUrl, `${fileBase}.svg`);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
