import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { MenuPrintPage } from "~/features/menu-print/pages/menu-print-page";
import { QrPanel } from "~/features/qr/components/qr-panel";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NoDomainState } from "~/shared/components/state/no-domain-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

export const Route = createFileRoute("/_auth/qr")({
  component: PrintPage,
});

function PrintPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para generar su QR y su carta." />;
  if (!branch.customDomain)
    return <NoDomainState description="El QR y la carta necesitan un dominio. Contacta con QMenut para asignarlo." />;
  return <PrintWorkspace branchId={branch.id} host={branch.customDomain} key={branch.id} />;
}

function PrintWorkspace({ branchId, host }: { branchId: string; host: string }) {
  const [tab, setTab] = useState("qr");
  const tabs = [
    { id: "qr", label: "Código QR" },
    { id: "menu", label: "Carta para imprimir" },
  ];
  return (
    <div className="admin-page admin-qr-page">
      <PageHeader kicker={host} title="QR y carta impresa" />
      <div className="admin-print-tabs" role="tablist" aria-label="Material para tu local">
        {tabs.map((item, index) => (
          <button
            id={`print-tab-${item.id}`}
            role="tab"
            type="button"
            key={item.id}
            aria-selected={tab === item.id}
            aria-controls={`print-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              let next = 1 - index;
              if (event.key === "Home") next = 0;
              if (event.key === "End") next = 1;
              setTab(tabs[next].id);
              document.querySelector<HTMLButtonElement>(`#print-tab-${tabs[next].id}`)?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div id="print-panel-qr" role="tabpanel" aria-labelledby="print-tab-qr" tabIndex={0} hidden={tab !== "qr"}>
        {tab === "qr" ? <QrPanel branchId={branchId} host={host} /> : null}
      </div>
      <div id="print-panel-menu" role="tabpanel" aria-labelledby="print-tab-menu" tabIndex={0} hidden={tab !== "menu"}>
        {tab === "menu" ? <MenuPrintPage branchId={branchId} host={host} /> : null}
      </div>
    </div>
  );
}
