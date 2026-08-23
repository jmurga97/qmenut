import { FormFeedback } from "~/shared/components/forms/form-feedback";

import { usePrintableMenuController } from "../hooks/use-printable-menu-controller";
import "../styles.css";

export interface PrintableMenuPanelProps {
  branchId: string;
  host: string;
}

function FoldDiagram() {
  return (
    <figure className="admin-printable-fold" aria-label="Orden de paneles de la carta plegada">
      <div className="admin-printable-sheet">
        <span>4</span>
        <span>1</span>
      </div>
      <div className="admin-printable-fold-mark" aria-hidden="true">
        plegar
      </div>
      <div className="admin-printable-sheet admin-printable-sheet--inside">
        <span>2</span>
        <span>3</span>
      </div>
      <figcaption>Exterior e interior quedan ordenados al imprimir a doble cara.</figcaption>
    </figure>
  );
}

export function PrintableMenuPanel({ branchId, host }: PrintableMenuPanelProps) {
  const controller = usePrintableMenuController({ branchId, host });
  const canDownload = !controller.loading && controller.locale.length > 0;
  let actionKey = "printable-waiting";
  if (controller.busy) actionKey = "printable-busy";
  else if (canDownload) actionKey = "printable-ready";

  return (
    <section className="admin-card admin-printable-menu" aria-labelledby="printable-menu-title">
      <div className="admin-printable-menu__intro">
        <div>
          <div className="admin-kicker">Carta para mesa</div>
          <h3 id="printable-menu-title">Menú plegable A4</h3>
          <p>Genera toda la carta en paneles A5, lista para imprimir, plegar y dejar sobre la mesa.</p>
        </div>
        <FoldDiagram />
      </div>
      <div className="admin-printable-menu__controls">
        <label className="admin-field">
          <span>Idioma de la carta</span>
          <select
            disabled={controller.busy || controller.loading}
            onChange={(event) => controller.setLocale(event.currentTarget.value)}
            value={controller.locale}
          >
            {controller.languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-printable-menu__summary" aria-live="polite">
          <span>{controller.loading ? "Cargando carta..." : `${controller.dishCount} platos activos`}</span>
          <span>A4 horizontal · doble cara · giro por borde corto · tamaño real</span>
        </div>
      </div>
      <FormFeedback error={controller.error} />
      <div className="admin-printable-menu__actions">
        <mc-button
          disabled={!canDownload || controller.busy || undefined}
          key={actionKey}
          onClick={() => void controller.download()}
          variant="primary"
        >
          {controller.busy ? "Generando PDF..." : "Descargar carta PDF"}
        </mc-button>
      </div>
    </section>
  );
}
