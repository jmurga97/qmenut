import { Link, Outlet, useLocation } from "@tanstack/react-router";

import { i18n } from "~/lib/i18n";
import { useCan } from "~/shared/hooks/use-can";

const TABS = [
  { label: i18n.t("loyalty___Operativa"), path: "/loyalty", permission: "loyalty.operate" },
  { label: i18n.t("loyalty___Programa"), path: "/loyalty/program", permission: "loyalty.manage" },
  { label: i18n.t("loyalty___Insights"), path: "/loyalty/insights", permission: "loyalty.insights" },
] as const;
export function LoyaltyLayout() {
  const location = useLocation();
  const permissions = {
    "loyalty.insights": useCan("loyalty.insights"),
    "loyalty.manage": useCan("loyalty.manage"),
    "loyalty.operate": useCan("loyalty.operate"),
  };
  const tabs = TABS.filter((tab) => permissions[tab.permission]);
  return (
    <div className="admin-loyalty-shell">
      <nav aria-label={i18n.t("loyalty___Secciones de fidelización")} className="admin-loyalty-tabs">
        {tabs.map((tab) => (
          <Link
            activeOptions={{ exact: true }}
            aria-current={location.pathname === tab.path ? "page" : undefined}
            className="admin-loyalty-tab"
            key={tab.path}
            to={tab.path}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
