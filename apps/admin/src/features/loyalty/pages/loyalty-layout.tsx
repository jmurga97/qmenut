import { Outlet } from "@tanstack/react-router";

import { i18n } from "~/lib/i18n";
import { PageHeader } from "~/shared/components/page-header";
import { SectionTabs } from "~/shared/components/section-tabs";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

const TABS = [
  { exact: true, label: i18n.t("loyalty___Operativa"), to: "/loyalty", permission: "loyalty.operate" },
  { label: i18n.t("loyalty___Programa"), to: "/loyalty/program", permission: "loyalty.manage" },
  { label: i18n.t("loyalty___Insights"), to: "/loyalty/insights", permission: "loyalty.insights" },
] as const;
export function LoyaltyLayout() {
  const branch = useSelectedBranch();
  const permissions = {
    "loyalty.insights": useCan("loyalty.insights"),
    "loyalty.manage": useCan("loyalty.manage"),
    "loyalty.operate": useCan("loyalty.operate"),
  };
  if (!branch)
    return <NoBranchState description={i18n.t("loyalty___Crea una sucursal antes de configurar la fidelización.")} />;
  return (
    <div className={"ming-page admin-page admin-loyalty-page"}>
      <PageHeader kicker={branch.name} title={i18n.t("loyalty___Fidelización")} />
      <SectionTabs
        ariaLabel={i18n.t("loyalty___Secciones de fidelización")}
        tabs={TABS.filter((tab) => permissions[tab.permission])}
      />
      <Outlet />
    </div>
  );
}
