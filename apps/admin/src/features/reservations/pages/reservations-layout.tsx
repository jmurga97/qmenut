import { Outlet } from "@tanstack/react-router";

import "~/features/reservations/styles.css";
import { i18n } from "~/lib/i18n";
import { PageHeader } from "~/shared/components/page-header";
import { SectionTabs } from "~/shared/components/section-tabs";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

const TABS = [
  { exact: true, label: i18n.t("reservations___Día"), to: "/reservations" },
  { label: i18n.t("reservations___Ajustes"), to: "/reservations/settings" },
  { label: i18n.t("reservations___Cierres"), to: "/reservations/closures" },
] as const;

export function ReservationsLayout() {
  const branch = useSelectedBranch();
  if (!branch) {
    return <NoBranchState description={i18n.t("reservations___Crea una sucursal antes de configurar las reservas.")} />;
  }

  return (
    <div className={"ming-page admin-page admin-reservations-page"}>
      <PageHeader kicker={branch.name} title={i18n.t("reservations___Reservas")} />
      <SectionTabs ariaLabel={i18n.t("reservations___Secciones de reservas")} tabs={TABS} />
      <Outlet />
    </div>
  );
}
