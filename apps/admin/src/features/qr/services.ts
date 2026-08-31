import QRCode from "qrcode";

const QR_OPTIONS = { errorCorrectionLevel: "Q", margin: 4 } as const;
export const QR_PREVIEW_SIZE = 240;

export type QrTarget = "menu" | "loyalty";

/**
 * `utm_source=qr` marca la visita como procedente del QR físico (PostHog la atribuye a sala).
 * `loyalty` apunta a `/puntos`, donde la carta abre el canje solo si la visita viene del QR.
 */
export function buildQrUrl(host: string, target: QrTarget): string {
  const path = target === "loyalty" ? "/puntos" : "/";
  return `https://${host}${path}?utm_source=qr`;
}
export function buildQrFileBase(host: string, target: QrTarget): string {
  const prefix = target === "loyalty" ? "qr-fidelizacion" : "qr";
  return `${prefix}-${host.replaceAll(".", "-")}`;
}
export function renderQrPreview(canvas: HTMLCanvasElement, url: string) {
  return QRCode.toCanvas(canvas, url, { ...QR_OPTIONS, width: QR_PREVIEW_SIZE });
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
  const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  downloadFile(objectUrl, `${fileBase}.svg`);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
