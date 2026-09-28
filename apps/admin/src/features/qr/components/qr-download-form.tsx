import { Button } from "@jmurga97/components";
import { Link } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormShell } from "~/shared/components/forms/form-shell";
import { QR_PREVIEW_SIZE } from "~/shared/services/qr";

import { QR_SIZE_OPTIONS, QR_TARGET_OPTIONS } from "../constants";

import type { useQrController } from "../hooks/use-qr-controller";

export function QrDownloadForm({
  controller,
  googlePlaceId,
  showPrintStyles,
  onTogglePrintStyles,
}: {
  controller: ReturnType<typeof useQrController>;
  googlePlaceId: string | null;
  showPrintStyles: boolean;
  onTogglePrintStyles: () => void;
}) {
  const target = controller.target;
  return (
    <FormProvider {...controller.form}>
      <FormShell
        actions={
          <>
            <Button onClick={onTogglePrintStyles} variant={"secondary"}>
              {showPrintStyles ? i18n.t("qr___Ocultar estilos") : i18n.t("qr___Estilos para imprimir")}
            </Button>
            <Button
              disabled={!controller.canGenerate}
              onClick={() => void controller.download("svg")}
              variant={"secondary"}
            >
              {i18n.t("qr___Descargar SVG")}
            </Button>
            <Button disabled={!controller.canGenerate} onClick={() => void controller.copy()} variant={"secondary"}>
              {i18n.t("qr___Copiar URL")}
            </Button>
          </>
        }
        onSubmit={() => void controller.download("png")}
        submitDisabled={!controller.canGenerate}
        submitLabel={<>{i18n.t("qr___Descargar PNG")}</>}
      >
        <div className="admin-qr-workspace">
          <div className="admin-qr-preview">
            <canvas ref={controller.canvasRef} height={QR_PREVIEW_SIZE} width={QR_PREVIEW_SIZE} />
          </div>
          <section className="admin-qr-controls" aria-labelledby="admin-qr-controls-title">
            <div className="admin-kicker" id="admin-qr-controls-title">
              {i18n.t("qr___Archivo de descarga")}
            </div>
            <p className="admin-copy">
              {i18n.t(
                "qr___Elige si el código abre la carta, la ficha directa de reseñas de Google o la tarjeta de fidelización.",
              )}
            </p>
            <FormSelect label={i18n.t("qr___Destino del QR")} name={"target"} options={QR_TARGET_OPTIONS} />
            <FormSelect label={i18n.t("qr___Tamaño del PNG")} name={"size"} options={QR_SIZE_OPTIONS} />
            {target === "reviews" && !googlePlaceId ? (
              <p className="admin-qr-setup-hint" role={"status"}>
                {i18n.t("qr___Conecta la ficha de Google de esta sucursal para generar el QR de reseñas.")}{" "}
                <Link to={"/branch"}>{i18n.t("qr___Abrir ajustes de sucursal")}</Link>
              </p>
            ) : null}
          </section>
        </div>
      </FormShell>
    </FormProvider>
  );
}
