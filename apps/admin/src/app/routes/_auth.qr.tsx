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

const PRINT_TABS = [
  { id: "tables", label: i18n.t("routes___QR para mesas") },
  { id: "flyer", label: i18n.t("routes___Folletos y carteles") },
  { id: "menu", label: i18n.t("routes___Carta impresa") },
] as const;

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
  const [tab, setTab] = useState<(typeof PRINT_TABS)[number]["id"]>("tables");
  function focusTab(index: number) {
    const next = PRINT_TABS[(index + PRINT_TABS.length) % PRINT_TABS.length];
    setTab(next.id);
    document.querySelector<HTMLButtonElement>(`#print-tab-${next.id}`)?.focus();
  }
  return (
    <div className="ming-page admin-page admin-qr-page">
      <PageHeader
        kicker={host}
        title={i18n.t("routes___Material para imprimir")}
        description={i18n.t(
          "routes___Prepara los QR y la carta de tu local. Elige el formato y comprueba cómo quedará antes de imprimir.",
        )}
      />
      <div className="admin-translation-tabs" role="tablist" aria-label={i18n.t("routes___Material para tu local")}>
        {PRINT_TABS.map((item, index) => (
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
              const moves: Record<string, number> = {
                ArrowLeft: index - 1,
                ArrowRight: index + 1,
                Home: 0,
                End: PRINT_TABS.length - 1,
              };
              if (!(event.key in moves)) return;
              event.preventDefault();
              focusTab(moves[event.key]);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {PRINT_TABS.map((item) => (
        <div
          id={`print-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`print-tab-${item.id}`}
          tabIndex={0}
          hidden={tab !== item.id}
          key={item.id}
        >
          <Activity mode={tab === item.id ? "visible" : "hidden"}>
            <Suspense fallback={<CardSkeleton rows={4} title={item.label} />}>
              {item.id === "menu" ? (
                <MenuPrintPage branchId={branchId} host={host} />
              ) : (
                <QrPanel branchId={branchId} host={host} mode={item.id} />
              )}
            </Suspense>
          </Activity>
        </div>
      ))}
    </div>
  );
}
