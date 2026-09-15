import { Button } from "@jmurga97/components";
import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";

import { notifyError } from "~/lib/notifications";
import { trpc } from "~/lib/trpc";
import { getThemeQueryOptions } from "~/shared/api";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormShell } from "~/shared/components/forms/form-shell";
import { Icon } from "~/shared/components/icon";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NoDomainState } from "~/shared/components/state/no-domain-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { useQrController } from "../hooks/use-qr-controller";
import { QR_PREVIEW_SIZE, renderQrSvg } from "../services";

import type { QrTarget } from "../services";
import type { CSSProperties, ReactNode } from "react";

const QR_SIZE_OPTIONS = [512, 1024, 2048].map((size) => ({ id: String(size), label: `${size} × ${size} px` }));
const QR_TARGET_OPTIONS = [
  { id: "menu", label: "Carta" },
  { id: "reviews", label: "Reseñas de Google" },
  { id: "loyalty", label: "Fidelización" },
];
const PRINT_LAYOUT_OPTIONS = [
  { id: "minimal", label: "Minimal", description: "A6 blanco" },
  { id: "branded", label: "Branded", description: "A6 con marca" },
  { id: "poster", label: "Póster", description: "A4 vertical" },
] as const;

type PrintLayout = (typeof PRINT_LAYOUT_OPTIONS)[number]["id"];

export function QrPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para generar su código QR." />;
  if (!branch.customDomain)
    return <NoDomainState description="El QR necesita un dominio. Contacta con QMenut para asignarlo." />;
  return <QrPanel branchId={branch.id} host={branch.customDomain} key={branch.id} />;
}

function QrPanel({ branchId, host }: { branchId: string; host: string }) {
  const { data: branch } = useSuspenseQuery(trpc.admin.branches.get.queryOptions({ branchId }));
  const themeQuery = useQuery({
    ...getThemeQueryOptions({ branchId, trpc }),
    retry: false,
  });
  const controller = useQrController({ domain: host, googlePlaceId: branch.googlePlaceId });
  const [layout, setLayout] = useState<PrintLayout>("branded");
  const [showPrintStyles, setShowPrintStyles] = useState(false);
  const qrSvg = useQrSvg(controller.url);
  const logoState = useLogoState(branch.logoUrl);

  const target = controller.target;
  const theme = themeQuery.data ? resolveTenantThemeConfig(themeQuery.data) : null;
  const themeVars = theme ? (buildQmThemeVars(theme) as CSSProperties) : undefined;
  const printReady = Boolean(qrSvg) && logoState !== "loading";

  return (
    <div className="admin-page admin-qr-page">
      <PageHeader kicker={`Códigos QR · ${host}`} title="Códigos QR" />
      {themeQuery.isPending ? <QrThemeState text="Cargando el tema de la sucursal…" /> : null}
      {themeQuery.isError ? (
        <QrThemeState text="No se pudo cargar el tema de esta sucursal.">
          <Button onClick={() => void themeQuery.refetch()} variant="secondary">
            Reintentar
          </Button>
        </QrThemeState>
      ) : null}
      <FormProvider {...controller.form}>
        <FormShell
          actions={
            <>
              <Button onClick={() => setShowPrintStyles((visible) => !visible)} variant="secondary">
                <Icon name="theme" /> {showPrintStyles ? "Ocultar estilos" : "Estilos para imprimir"}
              </Button>
              <Button
                disabled={!controller.canGenerate}
                onClick={() => void controller.download("svg")}
                variant="secondary"
              >
                <Icon name="download" /> Descargar SVG
              </Button>
              <Button disabled={!controller.canGenerate} onClick={() => void controller.copy()} variant="secondary">
                <Icon name="copy" /> Copiar URL
              </Button>
            </>
          }
          onSubmit={() => void controller.download("png")}
          submitDisabled={!controller.canGenerate}
          submitLabel={
            <>
              <Icon name="download" /> Descargar PNG
            </>
          }
        >
          <div className="admin-qr-workspace">
            <div className="admin-qr-preview">
              <canvas ref={controller.canvasRef} height={QR_PREVIEW_SIZE} width={QR_PREVIEW_SIZE} />
            </div>
            <section className="admin-qr-controls" aria-labelledby="admin-qr-controls-title">
              <div className="admin-kicker" id="admin-qr-controls-title">
                Archivo de descarga
              </div>
              <p className="admin-copy">
                Elige si el código abre la carta, la ficha directa de reseñas de Google o la tarjeta de fidelización.
              </p>
              <FormSelect label="Destino del QR" name="target" options={QR_TARGET_OPTIONS} />
              <FormSelect label="Tamaño del PNG" name="size" options={QR_SIZE_OPTIONS} />
              {target === "reviews" && !branch.googlePlaceId ? (
                <p className="admin-qr-setup-hint" role="status">
                  Conecta la ficha de Google de esta sucursal para generar el QR de reseñas.{" "}
                  <Link to="/branch">Abrir ajustes de sucursal</Link>
                </p>
              ) : null}
            </section>
          </div>
        </FormShell>
      </FormProvider>
      {theme && themeVars && showPrintStyles ? (
        <QrPrintablePanel
          branch={branch}
          layout={layout}
          logoState={logoState}
          onLayoutChange={setLayout}
          printReady={printReady}
          qrSvg={qrSvg}
          target={target}
          tagline={theme.tagline}
          theme={themeVars}
        />
      ) : null}
    </div>
  );
}

function useQrSvg(url: string | null) {
  const [result, setResult] = useState<{ svg: string; url: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    let active = true;
    void renderQrSvg(url)
      .then((svg) => {
        if (active) setResult({ svg, url });
      })
      .catch(notifyError);
    return () => {
      active = false;
    };
  }, [url]);
  return result?.url === url ? result.svg : null;
}

function useLogoState(logoUrl: string | null) {
  const [result, setResult] = useState<{ status: "ready" | "error"; url: string } | null>(null);
  useEffect(() => {
    if (!logoUrl) return;
    const image = new Image();
    image.addEventListener("load", () => setResult({ status: "ready", url: logoUrl }), { once: true });
    image.addEventListener("error", () => setResult({ status: "error", url: logoUrl }), { once: true });
    image.src = logoUrl;
    return () => {
      image.src = "";
    };
  }, [logoUrl]);
  if (!logoUrl) return "ready";
  if (result?.url !== logoUrl) return "loading";
  return result.status;
}

function QrThemeState({ children, text }: { children?: ReactNode; text: string }) {
  return (
    <section className="admin-card admin-qr-theme-state" role="status">
      <p>{text}</p>
      {children}
    </section>
  );
}

function QrPrintablePanel({
  branch,
  layout,
  logoState,
  onLayoutChange,
  printReady,
  qrSvg,
  tagline,
  target,
  theme,
}: {
  branch: { logoUrl: string | null; name: string };
  layout: PrintLayout;
  logoState: "loading" | "ready" | "error";
  onLayoutChange: (layout: PrintLayout) => void;
  printReady: boolean;
  qrSvg: string | null;
  tagline?: string;
  target: QrTarget;
  theme: CSSProperties;
}) {
  let instruction = "Escanea para ver la carta";
  if (target === "reviews") instruction = "Comparte tu experiencia en Google";
  if (target === "loyalty") instruction = "Escanea para acceder a tu tarjeta";
  const targetLabel = QR_TARGET_OPTIONS.find((option) => option.id === target)?.label;

  async function print() {
    if (!printReady) return;
    await document.fonts?.ready;
    const pageSize = layout === "poster" ? "A4" : "A6";
    const printStyle = document.createElement("style");
    printStyle.dataset.qrPrint = "true";
    printStyle.textContent = `@page { size: ${pageSize} portrait; margin: 0; }`;
    document.head.append(printStyle as unknown as string);
    document.body.classList.add("admin-qr-printing");
    const cleanup = () => {
      document.body.classList.remove("admin-qr-printing");
      printStyle.remove();
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  }

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
      <div aria-label="Estilo de impresión" className="admin-qr-print-layouts" role="radiogroup">
        {PRINT_LAYOUT_OPTIONS.map((option) => (
          <button
            aria-checked={layout === option.id}
            className={`admin-qr-print-layout${layout === option.id ? " admin-qr-print-layout--selected" : ""}`}
            key={option.id}
            onClick={() => onLayoutChange(option.id)}
            role="radio"
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
      <div className={`admin-qr-printable admin-qr-printable--${layout}`} style={theme}>
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
      {printReady ? null : <p className="admin-field-hint">Preparando el QR y la identidad visual…</p>}
    </section>
  );
}
