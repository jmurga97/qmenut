import { Button } from "@jmurga97/components";
import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { useState } from "react";

import { Icon } from "~/shared/components/icon";

import { PRINT_LAYOUT_OPTIONS, QR_TARGET_OPTIONS } from "../constants";
import { useQrPrint } from "../hooks/use-qr-print";

import type { PrintLayout } from "../constants";
import type { QrTarget } from "../services";
import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

export function QrPrintablePanel({
  branch,
  target,
  theme,
  url,
}: {
  branch: { logoUrl: string | null; name: string };
  target: QrTarget;
  theme: QmTenantThemeConfig;
  url: string | null;
}) {
  const [layout, setLayout] = useState<PrintLayout>("branded");
  const { qrSvg, logoState, fontState, printReady, print, printableRef } = useQrPrint({
    url,
    logoUrl: branch.logoUrl,
    theme,
    layout,
  });
  let instruction = "Escanea para ver la carta";
  if (target === "reviews") instruction = "Comparte tu experiencia en Google";
  if (target === "loyalty") instruction = "Escanea para acceder a tu tarjeta";
  const targetLabel = QR_TARGET_OPTIONS.find((option) => option.id === target)?.label;
  const tagline = theme.tagline;
  return (
    <section className="admin-card admin-qr-print-section" aria-labelledby="admin-qr-print-title">
      <div className="admin-qr-print-section__heading">
        <div>
          <div className="admin-kicker">Estilos para imprimir</div>
          <h3 id="admin-qr-print-title">Un QR listo para tu local</h3>
          <p>Elige una composición con el tema guardado de la sucursal y abre la impresión o guarda un PDF.</p>
        </div>
        <Button disabled={!printReady} onClick={() => void print()} variant="primary">
          <Icon name="download" /> Imprimir / Guardar PDF
        </Button>
      </div>
      <div aria-label="Estilo de impresión" className="admin-qr-print-layouts" role="group">
        {PRINT_LAYOUT_OPTIONS.map((option) => (
          <button
            aria-pressed={layout === option.id}
            className={`admin-qr-print-layout${layout === option.id ? " admin-qr-print-layout--selected" : ""}`}
            key={option.id}
            onClick={() => setLayout(option.id)}
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
      <div
        ref={printableRef}
        className={`admin-qr-printable admin-qr-printable--${layout}${layout === "poster-primary" ? " admin-qr-printable--poster" : ""}`}
        style={buildQmThemeVars(theme)}
      >
        <div className="admin-qr-printable__brand">
          {branch.logoUrl && logoState === "ready" ? <img alt="" src={branch.logoUrl} /> : null}
          <span>{branch.name}</span>
        </div>
        <p className="admin-qr-printable__target">{targetLabel}</p>
        {qrSvg ? (
          <div className="admin-qr-printable__code" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        ) : (
          <div className="admin-qr-printable__code admin-qr-printable__code--empty" />
        )}
        <p className="admin-qr-printable__instruction">{instruction}</p>
        {tagline ? <p className="admin-qr-printable__tagline">{tagline}</p> : null}
      </div>
      {printReady ? null : (
        <p className="admin-field-hint">
          {fontState === "error"
            ? "No se pudieron cargar las tipografías. Recarga la página para volver a intentarlo."
            : "Preparando el QR y la identidad visual…"}
        </p>
      )}
    </section>
  );
}
