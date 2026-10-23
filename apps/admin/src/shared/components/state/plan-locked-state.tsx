import { Link } from "@tanstack/react-router";

import { i18n } from "~/lib/i18n";
import { useCan, useFeature } from "~/shared/hooks/use-can";

import { EmptyState } from "./empty-state";

import type { PlanFeature } from "@qmenut/permissions";
import type { ReactNode } from "react";

function UpgradeLink() {
  return useCan("billing.manage") ? <Link to="/billing">{i18n.t("shared___Ver planes")}</Link> : null;
}

/** Replaces a whole section on plans without it; the data stays stored for a later upgrade. */
export function PlanLockedState() {
  return (
    <div className={"ming-page admin-page"}>
      <EmptyState
        description={i18n.t("shared___Esta sección está incluida en el plan Business. Tus datos se conservan.")}
        title={i18n.t("shared___Disponible en Business")}
      >
        <UpgradeLink />
      </EmptyState>
    </div>
  );
}

/** Disables the controls inside on plans without the feature (native fieldset disabling). */
export function PlanLock({ children, feature }: { children: ReactNode; feature: PlanFeature }) {
  const enabled = useFeature(feature);
  return (
    <fieldset className="admin-plan-lock" disabled={!enabled}>
      {children}
      {enabled ? null : (
        <p className="admin-copy">
          {i18n.t("shared___Disponible en el plan Business.")} <UpgradeLink />
        </p>
      )}
    </fieldset>
  );
}
