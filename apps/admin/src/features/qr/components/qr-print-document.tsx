import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";

import { getQrPrintCopy } from "../constants";

import type { QR_PAPER_SIZES, QR_TABLE_SIZES, QrPrintLanguage, QrPrintMode, QrPrintStyle } from "../constants";
import type { QmTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import type { CSSProperties } from "react";
import type { QrSvgMarkup, QrTarget } from "~/shared/services/qr";

export interface QrPrintBranch {
  googlePlaceId: string | null;
  logoUrl: string | null;
  name: string;
}

type QrDocumentProps = {
  branch: QrPrintBranch;
  codes: Record<QrTarget, { svg: QrSvgMarkup | null }>;
  host: string;
  language: QrPrintLanguage;
  logoReady: boolean;
  mode: QrPrintMode;
  paper: (typeof QR_PAPER_SIZES)[number];
  quantity: number;
  style: QrPrintStyle;
  tableSize: (typeof QR_TABLE_SIZES)[number];
  targets: QrTarget[];
  theme: QmTenantThemeConfig | null;
};

function QrBrand({ branch, logoReady }: { branch: QrPrintBranch; logoReady: boolean }) {
  return (
    <div className="admin-qr-brand">
      {branch.logoUrl && logoReady ? <img alt="" src={branch.logoUrl} /> : null}
      <span>{branch.name}</span>
    </div>
  );
}

function QrCode({ label, svg }: { label: string; svg: QrSvgMarkup | null }) {
  return (
    <div
      aria-label={label}
      className="admin-qr-code"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      role="img"
    />
  );
}

export function QrPrintDocument(props: QrDocumentProps) {
  const { language, mode, theme, style } = props;
  return (
    <div
      className={`admin-qr-document admin-qr-document--${style}`}
      lang={language}
      style={theme && style !== "plain" ? buildQmThemeVars(theme) : undefined}
    >
      {mode === "tables" ? <QrTableSheets {...props} /> : <QrFlyer {...props} />}
    </div>
  );
}

function QrTableSheets({ branch, codes, language, logoReady, quantity, style, tableSize, targets }: QrDocumentProps) {
  const capacity = tableSize.columns * tableSize.rows;
  const target = targets[0];
  if (!target) return null;
  return Array.from({ length: Math.ceil(quantity / capacity) }, (_, page) => (
    <div
      className="admin-qr-paper admin-qr-table-sheet"
      key={page}
      style={
        {
          "--qr-columns": tableSize.columns,
          "--qr-label-mm": tableSize.mm,
        } as CSSProperties
      }
    >
      <div className="admin-qr-table-grid">
        {Array.from({ length: Math.min(capacity, quantity - page * capacity) }, (_, index) => (
          <div className="admin-qr-table-tile" data-qr-fit key={index}>
            {style === "plain" ? null : <QrBrand branch={branch} logoReady={logoReady} />}
            <QrCode label={getQrPrintCopy(language)[target].label} svg={codes[target].svg} />
          </div>
        ))}
      </div>
    </div>
  ));
}

function QrFlyer({ branch, codes, host, language, logoReady, paper, style, targets, theme }: QrDocumentProps) {
  const copy = getQrPrintCopy(language);
  return (
    <div
      className="admin-qr-paper admin-qr-flyer"
      style={
        {
          aspectRatio: `${paper.width} / ${paper.height}`,
          "--qr-paper-width": `${paper.width}mm`,
          "--qr-paper-height": `${paper.height}mm`,
        } as CSSProperties
      }
    >
      <div className="admin-qr-flyer-content" data-qr-fit>
        {style === "plain" ? null : <QrBrand branch={branch} logoReady={logoReady} />}
        <div className={`admin-qr-flyer-codes admin-qr-flyer-codes--${targets.length}`}>
          {targets.map((target) => (
            <div className="admin-qr-flyer-target" key={target}>
              <span className="admin-qr-flyer-eyebrow">{copy[target].label}</span>
              <QrCode label={copy[target].label} svg={codes[target].svg} />
              <p>{copy[target].instruction}</p>
            </div>
          ))}
        </div>
        <footer className="admin-qr-flyer-footer">
          {style !== "plain" && theme?.tagline ? <p>{theme.tagline}</p> : null}
          <span>{host}</span>
        </footer>
      </div>
    </div>
  );
}
