import QRCode from "qrcode";

import { QR_OPTIONS, renderQrSvg } from "~/shared/services/qr";

import type { QrTarget } from "~/shared/services/qr";

interface BuildQrFileBaseInput {
  domain: string;
  target: QrTarget;
}

export function buildQrFileBase({ domain, target }: BuildQrFileBaseInput): string {
  let prefix = "qr";
  if (target === "loyalty") prefix = "qr-fidelizacion";
  if (target === "reviews") prefix = "qr-resenas-google";
  return `${prefix}-${domain.replaceAll(".", "-")}`;
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
