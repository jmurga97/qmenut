import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

import { EmptyState } from "@components/empty-state";
import { getErrorMessage } from "@lib/errors";
import { useSelectedBranch } from "@lib/use-selected-branch";

const DOWNLOAD_SIZES = [512, 1024, 2048] as const;
const PREVIEW_SIZE = 240;

// Nivel Q (25% de redundancia): aguanta impresión pequeña, plastificados y desgaste.
const QR_OPTIONS = { errorCorrectionLevel: "Q", margin: 4 } as const;

function downloadFile(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}

export function QrCodeView() {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <EmptyState title="Sin sucursal" description="Crea una sucursal para generar su código QR." />
      </div>
    );
  }

  if (!branch.customDomain) {
    return (
      <div className="admin-page">
        <EmptyState
          title="Sin dominio"
          description="El QR apunta al dominio de la carta. Contacta con QMenut para asignar el dominio de esta sucursal."
        />
      </div>
    );
  }

  return <QrCodePanel host={branch.customDomain} key={branch.id} />;
}

function QrCodePanel({ host }: { host: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<number>(1024);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = `https://${host}`;
  const fileBase = `qr-${host.replaceAll(".", "-")}`;

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    QRCode.toCanvas(canvasRef.current, url, { ...QR_OPTIONS, width: PREVIEW_SIZE }).catch((cause: unknown) =>
      setError(getErrorMessage(cause)),
    );
  }, [url]);

  async function handleDownloadPng() {
    setError(null);

    try {
      const dataUrl = await QRCode.toDataURL(url, { ...QR_OPTIONS, width: size });
      downloadFile(dataUrl, `${fileBase}-${size}.png`);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function handleDownloadSvg() {
    setError(null);

    try {
      const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const objectUrl = URL.createObjectURL(blob);
      downloadFile(objectUrl, `${fileBase}.svg`);
      URL.revokeObjectURL(objectUrl);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function handleCopyUrl() {
    setError(null);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">Código QR · {host}</div>
        <h2>Código QR de la carta</h2>
        <p>Descárgalo e imprímelo en mesas, barra o escaparate. Apunta a {url}.</p>
      </header>

      <div className="admin-editor-shell">
        <section className="admin-editor-section">
          <div className="admin-qr-preview">
            <canvas ref={canvasRef} height={PREVIEW_SIZE} width={PREVIEW_SIZE} />
          </div>
        </section>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Tamaño del PNG</span>
            <select onChange={(event) => setSize(Number(event.currentTarget.value))} value={size}>
              {DOWNLOAD_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option} × {option} px
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <mc-inline-message message={error} tone="error" /> : null}
        {copied ? <mc-inline-message message="URL copiada." tone="success" /> : null}

        <div className="admin-topbar-actions">
          <mc-button onClick={() => void handleDownloadPng()} variant="primary">
            Descargar PNG
          </mc-button>
          <mc-button onClick={() => void handleDownloadSvg()} variant="secondary">
            Descargar SVG
          </mc-button>
          <mc-button onClick={() => void handleCopyUrl()} variant="secondary">
            Copiar URL
          </mc-button>
        </div>
      </div>
    </div>
  );
}
