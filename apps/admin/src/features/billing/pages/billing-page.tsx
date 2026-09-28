import { Button } from "@jmurga97/components";
import { Suspense } from "react";

import { i18n } from "~/lib/i18n";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";

import { useBillingController } from "../hooks/use-billing-controller";

const STATUS_LABELS: Record<string, string> = {
  trialing: i18n.t("billing___En prueba"),
  active: i18n.t("billing___Activa"),
  past_due: i18n.t("billing___Pago pendiente"),
  canceled: i18n.t("billing___Cancelada"),
};
const PLAN_LABELS: Record<string, string> = { basic: i18n.t("billing___Básico") };
const PLANS = [{ code: "basic", label: i18n.t("billing___Suscribir Básico"), variant: "secondary" }] as const;
export function BillingPage() {
  return (
    <div className={"ming-page admin-page"}>
      <PageHeader kicker={i18n.t("billing___Facturación")} title={i18n.t("billing___Suscripción")} />
      <Suspense
        fallback={
          <div className="admin-page-grid">
            <CardSkeleton rows={1} />
            <CardSkeleton rows={1} />
          </div>
        }
      >
        <BillingBranches />
      </Suspense>
    </div>
  );
}
function BillingBranches() {
  const controller = useBillingController();
  return (
    <div className="admin-page-grid">
      {controller.overview.branches.map((branch) => {
        const active = branch.status === "active" || branch.status === "trialing";
        return (
          <section className="admin-card" key={branch.branchId}>
            <h3 className="admin-list-label">{branch.branchName}</h3>
            <p className="admin-list-meta">
              {branch.status ? (STATUS_LABELS[branch.status] ?? branch.status) : i18n.t("billing___Sin suscripción")}
              {branch.planCode ? ` · ${PLAN_LABELS[branch.planCode] ?? branch.planCode}` : ""}
            </p>
            {branch.cancelAtPeriodEnd ? (
              <p className="admin-copy">{i18n.t("billing___Cancelación programada.")}</p>
            ) : null}
            <div className="admin-topbar-actions">
              {active ? (
                <Button
                  aria-label={i18n.t("billing___Gestionar {{branch}} en Stripe", { branch: branch.branchName })}
                  disabled={controller.busy}
                  onClick={controller.openPortal}
                >
                  {i18n.t("billing___Gestionar en Stripe")}
                </Button>
              ) : (
                PLANS.map((plan) => (
                  <Button
                    aria-label={i18n.t("billing___{{plan}} para {{branch}}", {
                      plan: plan.label,
                      branch: branch.branchName,
                    })}
                    disabled={controller.busy}
                    key={plan.code}
                    onClick={() => controller.subscribe(branch.branchId, plan.code)}
                    variant={plan.variant}
                  >
                    {plan.label}
                  </Button>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
