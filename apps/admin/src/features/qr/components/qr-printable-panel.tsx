import { Button, Checkbox, Field, Input, Select } from "@jmurga97/components";
import { Link } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";

import { QrDownloadForm } from "./qr-download-form";
import { QrPrintDocument } from "./qr-print-document";
import { QR_PAPER_SIZES, QR_STYLE_OPTIONS, QR_TABLE_SIZES } from "../constants";
import { useQrPrintController } from "../hooks/use-qr-print-controller";

import type { QrPrintBranch } from "./qr-print-document";
import type { QrPrintMode } from "../constants";
import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

export function QrPrintablePanel({
  branch,
  host,
  mode,
  theme,
}: {
  branch: QrPrintBranch;
  host: string;
  mode: QrPrintMode;
  theme: QmTenantThemeConfig | null;
}) {
  const state = useQrPrintController({ branch, host, mode, theme });
  const {
    controller,
    style,
    tableSize,
    paper,
    quantity,
    quantityValid,
    targets,
    assets,
    canPrint,
    previewLabel,
    status,
  } = state;
  const title = mode === "tables" ? i18n.t("qr___QR para las mesas") : i18n.t("qr___Folletos y carteles");
  let intro = i18n.t("qr___El mismo QR, tantas veces como necesites. Imprime en A4 y recorta por las guías.");
  if (mode === "flyer") {
    intro =
      state.targetOptions.length > 1
        ? i18n.t("qr___Tu carta, las reseñas y la fidelización, juntos o por separado en una misma página.")
        : i18n.t("qr___Tu carta en una página, lista para imprimir.");
  }
  return (
    <FormProvider {...controller.form}>
      <div className="admin-qr-editor">
        <section className="admin-card admin-qr-controls" aria-labelledby={`qr-${mode}-title`}>
          <div className="admin-qr-intro">
            <h2 id={`qr-${mode}-title`}>{title}</h2>
            <p>{intro}</p>
          </div>
          <QrPrintFields state={state} mode={mode} googlePlaceId={branch.googlePlaceId} />
          <Field
            label={i18n.t("qr___Estilo")}
            hint={
              style === "plain"
                ? i18n.t("qr___Sin logo ni colores. El QR se imprime negro sobre blanco.")
                : i18n.t("qr___Usa el logo, los colores y las tipografías guardados de esta sucursal.")
            }
          >
            <Select
              value={style}
              onValueChange={(value) => value && state.setStyleId(value)}
              options={[...QR_STYLE_OPTIONS]}
            />
          </Field>
          {!branch.googlePlaceId &&
          state.targetOptions.some((option) => option.id === "reviews") &&
          (mode === "flyer" || controller.target === "reviews") ? (
            <p className="admin-field-hint">
              {i18n.t("qr___Conecta la ficha de Google de esta sucursal para generar el QR de reseñas.")}{" "}
              <Link to="/branch">{i18n.t("qr___Abrir ajustes de sucursal")}</Link>
            </p>
          ) : null}
          {style !== "plain" && assets.logoState === "error" ? (
            <p className="admin-field-hint">
              {i18n.t("qr___No se pudo cargar el logo. Se imprimirá el nombre del local.")}
            </p>
          ) : null}
          <div className="admin-qr-print-actions">
            <p className="admin-qr-status" role="status">
              {status}
            </p>
            <Button
              disabled={!canPrint}
              onClick={() => {
                if (canPrint) assets.print();
              }}
              variant="primary"
            >
              {i18n.t("qr___Imprimir / Guardar PDF")}
            </Button>
            <p className="admin-field-hint">
              {i18n.t("qr___Imprime a escala 100 %, sin encabezados. Para descargar, elige «Guardar como PDF».")}
            </p>
            {style === "colour" ? (
              <p className="admin-field-hint">
                {i18n.t("qr___Activa los gráficos de fondo para imprimir el color de marca.")}
              </p>
            ) : null}
          </div>
          {mode === "tables" ? <QrDownloadForm controller={controller} /> : null}
        </section>
        <section className="admin-qr-preview-area" aria-label={i18n.t("qr___Vista previa de impresión")}>
          <div className="admin-qr-preview-heading">
            <h2>{i18n.t("qr___Vista previa")}</h2>
            <p>{previewLabel}</p>
          </div>
          <div ref={assets.printableRef}>
            <QrPrintDocument
              branch={branch}
              codes={assets.codes}
              host={host}
              logoReady={assets.logoState === "ready"}
              mode={mode}
              paper={paper}
              quantity={quantityValid ? quantity : 0}
              style={style}
              tableSize={tableSize}
              targets={targets}
              theme={theme}
            />
          </div>
        </section>
      </div>
    </FormProvider>
  );
}

function QrPrintFields({
  state,
  mode,
  googlePlaceId,
}: {
  state: ReturnType<typeof useQrPrintController>;
  mode: QrPrintMode;
  googlePlaceId: string | null;
}) {
  const {
    sizeId,
    setSizeId,
    paperId,
    setPaperId,
    quantityInput,
    setQuantityInput,
    quantityValid,
    flyerTargets,
    setFlyerTargets,
    paper,
    targetOptions,
  } = state;
  return (
    <>
      {mode === "tables" ? (
        <>
          <FormSelect label={i18n.t("qr___Destino del QR")} name="target" options={targetOptions} />
          <Field label={i18n.t("qr___Tamaño de cada QR")}>
            <Select value={sizeId} onValueChange={(value) => value && setSizeId(value)} options={[...QR_TABLE_SIZES]} />
          </Field>
          <Field
            label={i18n.t("qr___Cantidad de QR")}
            invalid={!quantityValid}
            error={quantityValid ? undefined : i18n.t("qr___Indica una cantidad entre 1 y 300.")}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={300}
              step={1}
              value={quantityInput}
              onValueChange={setQuantityInput}
              invalid={!quantityValid}
            />
          </Field>
        </>
      ) : (
        <>
          <fieldset className="admin-qr-destinations">
            <legend>{i18n.t("qr___Qué quieres incluir")}</legend>
            {targetOptions.map((option) => (
              <Checkbox
                key={option.id}
                label={option.label}
                checked={flyerTargets.includes(option.id)}
                disabled={option.id === "reviews" && !googlePlaceId}
                onCheckedChange={(checked) =>
                  setFlyerTargets(
                    targetOptions
                      .filter((candidate) =>
                        candidate.id === option.id ? checked : flyerTargets.includes(candidate.id),
                      )
                      .map((candidate) => candidate.id),
                  )
                }
              />
            ))}
          </fieldset>
          <Field label={i18n.t("qr___Tamaño del papel")} hint={`${paper.width} × ${paper.height} mm`}>
            <Select
              value={paperId}
              onValueChange={(value) => value && setPaperId(value)}
              options={[...QR_PAPER_SIZES]}
            />
          </Field>
        </>
      )}
    </>
  );
}
