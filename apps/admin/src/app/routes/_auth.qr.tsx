import { createFileRoute } from "@tanstack/react-router";
import { Activity, Suspense, useState } from "react";

import { MenuPrintPage } from "~/features/menu-print/pages/menu-print-page";
import { QrPanel } from "~/features/qr/components/qr-panel";
import { i18n } from "~/lib/i18n";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NoDomainState } from "~/shared/components/state/no-domain-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

export const Route = createFileRoute("/_auth/qr")({
  component: PrintPage,
});

function PrintPage() {
  const branch = useSelectedBranch();
  if (!branch)
    return <NoBranchState description={i18n.t("routes___Crea una sucursal para generar su QR y su carta.")} />;
  if (!branch.customDomain)
    return (
      <NoDomainState
        description={i18n.t("routes___El QR y la carta necesitan un dominio. Contacta con QMenut para asignarlo.")}
      />
    );
  return <PrintWorkspace branchId={branch.id} host={branch.customDomain} key={branch.id} />;
}

function PrintWorkspace({ branchId, host }: { branchId: string; host: string }) {
  const [tab, setTab] = useState("qr");
  const tabs = [
    { id: "qr", label: i18n.t("routes___Código QR") },
    { id: "menu", label: i18n.t("routes___Carta para imprimir") },
  ];
  return (
    <div className={"ming-page admin-page admin-qr-page"}>
      <PageHeader kicker={host} title={i18n.t("routes___QR y carta impresa")} />
      <div className="admin-print-tabs" role={"tablist"} aria-label={i18n.t("routes___Material para tu local")}>
        {tabs.map((item, index) => (
          <button
            id={`print-tab-${item.id}`}
            role={"tab"}
            type={"button"}
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
      <div id={"print-panel-qr"} role={"tabpanel"} aria-labelledby={"print-tab-qr"} tabIndex={0} hidden={tab !== "qr"}>
        <Activity mode={tab === "qr" ? "visible" : "hidden"}>
          <Suspense fallback={<CardSkeleton rows={4} title={i18n.t("routes___Código QR")} />}>
            <QrPanel branchId={branchId} host={host} />
          </Suspense>
        </Activity>
      </div>
      <div
        id={"print-panel-menu"}
        role={"tabpanel"}
        aria-labelledby={"print-tab-menu"}
        tabIndex={0}
        hidden={tab !== "menu"}
      >
        <Activity mode={tab === "menu" ? "visible" : "hidden"}>
          <MenuPrintPage branchId={branchId} host={host} />
        </Activity>
      </div>
    </div>
  );
}
