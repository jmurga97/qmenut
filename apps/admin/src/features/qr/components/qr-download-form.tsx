import { Button } from "@jmurga97/components";

import { i18n } from "~/lib/i18n";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";

import { QR_SIZE_OPTIONS } from "../constants";

import type { useQrController } from "../hooks/use-qr-controller";

export function QrDownloadForm({ controller }: { controller: ReturnType<typeof useQrController> }) {
  return (
    <details className="admin-qr-downloads">
      <summary>{i18n.t("qr___Descargar el QR para otro diseño")}</summary>
      <div className="ming-stack">
        <p className="admin-field-hint">
          {i18n.t("qr___Solo el código, sin marca. Para enviarlo a tu diseñador o usarlo en otro documento.")}
        </p>
        <FormSelect label={i18n.t("qr___Tamaño del PNG")} name="size" options={QR_SIZE_OPTIONS} />
        <div className="admin-qr-download-actions">
          <Button
            disabled={!controller.canGenerate}
            onClick={() => void controller.download("png")}
            variant="secondary"
          >
            {i18n.t("qr___Descargar PNG")}
          </Button>
          <Button
            disabled={!controller.canGenerate}
            onClick={() => void controller.download("svg")}
            variant="secondary"
          >
            {i18n.t("qr___Descargar SVG")}
          </Button>
          <Button disabled={!controller.canGenerate} onClick={() => void controller.copy()} variant="ghost">
            {i18n.t("qr___Copiar URL")}
          </Button>
        </div>
      </div>
    </details>
  );
}
