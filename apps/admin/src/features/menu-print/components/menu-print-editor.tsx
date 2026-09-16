import { Button } from "@jmurga97/components";
import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { useMemo, useState } from "react";

import { Icon } from "~/shared/components/icon";
import { useLogoState, usePrintFonts, useQrSvg } from "~/shared/hooks/use-print-assets";
import { usePrintDocument } from "~/shared/hooks/use-print-document";
import { buildQrUrl } from "~/shared/services/qr";

import { PrintDocument, PrintMeasurements } from "./print-document";
import { getPrintCategories } from "../content";
import { useMenuPagination } from "../hooks/use-menu-pagination";

import type { MenuData, PrintCategory, PrintFormat } from "../content";
import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";

function CategoryPicker({
  categories,
  excluded,
  onChange,
}: {
  categories: PrintCategory[];
  excluded: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="menu-print-categories">
      <legend>Categorías de la carta</legend>
      {categories.map((category) => (
        <label key={category.id}>
          <input
            type="checkbox"
            checked={!excluded.includes(category.id)}
            onChange={(event) =>
              onChange(event.target.checked ? excluded.filter((id) => id !== category.id) : [...excluded, category.id])
            }
          />
          <span>{category.name}</span>
          <small>{category.dishes.length}</small>
        </label>
      ))}
    </fieldset>
  );
}

export function MenuPrintEditor({ data, theme, host }: { data: MenuData; theme: QmTenantThemeConfig; host: string }) {
  const [format, setFormat] = useState<PrintFormat>("a4");
  const [excluded, setExcluded] = useState<string[]>([]);
  const allCategories = useMemo(() => getPrintCategories(data), [data]);
  const categories = useMemo(() => allCategories.filter(({ id }) => !excluded.includes(id)), [allCategories, excluded]);
  const fontState = usePrintFonts(theme);
  const logoState = useLogoState(data.branch.logoUrl);
  const qr = useQrSvg(buildQrUrl({ domain: host, target: "menu" }));
  const assetsReady = fontState === "ready" && logoState !== "loading" && Boolean(qr.svg);
  const { printableRef, print } = usePrintDocument({
    ready: assetsReady,
    pageSize: format === "a4" ? "210mm 297mm" : "297mm 210mm",
    outputClass: "admin-menu-print-output",
    bodyClass: "admin-menu-printing",
  });
  const layoutKey = JSON.stringify({ format, theme, logoState, name: data.branch.name, tagline: data.tagline });
  const pages = useMenuPagination({ ref: printableRef, categories, ready: assetsReady, layoutKey });
  const canPrint = Boolean(pages && !pages.overflow && categories.length > 0);
  let status = "Preparando las tipografías y la carta…";
  if (pages) status = "La carta cabe en una hoja a doble cara.";
  if (pages?.overflow) status = "La carta no cabe. Desmarca categorías hasta que quepa; no se recortará ningún plato.";
  if (categories.length === 0) status = "Selecciona al menos una categoría para imprimir.";
  if (fontState === "error" || qr.error)
    status = "No se pudo preparar la carta. Recarga la página para volver a intentarlo.";
  return (
    <div className="menu-print-editor">
      <section className="admin-card menu-print-controls" aria-labelledby="menu-print-title">
        <div>
          <div className="admin-kicker">Del menú a la mesa</div>
          <h2 id="menu-print-title">Carta para imprimir</h2>
          <p>Tu plantilla, tus colores y tus fuentes. Sin fotografías y con los precios habituales.</p>
        </div>
        <fieldset className="menu-print-formats">
          <legend>Formato del papel</legend>
          <label htmlFor="print-format-a4" aria-label="A4 a doble cara">
            <input
              id="print-format-a4"
              type="radio"
              name="print-format"
              checked={format === "a4"}
              onChange={() => setFormat("a4")}
            />
            <span>
              <strong>A4 a doble cara</strong>
              <small>Una hoja vertical, anverso y reverso</small>
            </span>
          </label>
          <label htmlFor="print-format-folded" aria-label="Díptico">
            <input
              id="print-format-folded"
              type="radio"
              name="print-format"
              checked={format === "folded"}
              onChange={() => setFormat("folded")}
            />
            <span>
              <strong>Díptico</strong>
              <small>Una hoja horizontal, cuatro caras A5</small>
            </span>
          </label>
        </fieldset>
        <CategoryPicker categories={allCategories} excluded={excluded} onChange={setExcluded} />
        <p className={`menu-print-status${pages?.overflow ? " menu-print-status--overflow" : ""}`} role="status">
          {status}
        </p>
        {logoState === "error" ? (
          <p className="admin-field-hint">No se pudo cargar el logo. Se imprimirá el nombre del local.</p>
        ) : null}
        <Button
          disabled={!canPrint}
          onClick={() => {
            if (canPrint) print();
          }}
          variant="primary"
        >
          <Icon name="download" /> Imprimir / Guardar PDF
        </Button>
        <p className="admin-field-hint">
          Elige A4, escala 100 %, sin encabezados y con gráficos de fondo. Para doble cara, gira por el borde{" "}
          {format === "a4" ? "largo" : "corto"}. Para descargar, elige «Guardar como PDF» en el diálogo de impresión.
        </p>
      </section>
      <div
        ref={printableRef}
        className={`menu-print-document menu-print-document--${format}`}
        style={buildQmThemeVars(theme)}
        lang={data.language.effective}
      >
        <PrintDocument
          categories={categories}
          format={format}
          slots={pages?.slots ?? []}
          name={data.branch.name}
          tagline={data.tagline || theme.tagline || ""}
          logoUrl={logoState === "ready" ? data.branch.logoUrl : null}
          qrSvg={qr.svg}
        />
        <PrintMeasurements categories={categories} />
      </div>
    </div>
  );
}
