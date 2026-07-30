import { FormFeedback } from "~/shared/components/forms/form-feedback";
import { PageHeader } from "~/shared/components/page-header";

import { useBillingController } from "../hooks/use-billing-controller";

const STATUS_LABELS: Record<string, string> = {
  trialing: "En prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
};
const PLAN_LABELS: Record<string, string> = { basic: "Básico", business: "Business" };
const PLANS = [
  { code: "basic", label: "Suscribir Básico", variant: "secondary" },
  { code: "business", label: "Suscribir Business", variant: "primary" },
] as const;
export function BillingPage() {
  const controller = useBillingController();
  return (
    <div className="admin-page">
      <PageHeader kicker="Facturación" title="Suscripción" />
      <FormFeedback error={controller.error} />
      <div className="admin-page-grid">
        {controller.overview.branches.map((branch) => {
          const active = branch.status === "active" || branch.status === "trialing";
          return (
            <section className="admin-card" key={branch.branchId}>
              <h3 className="admin-list-label">{branch.branchName}</h3>
              <p className="admin-list-meta">
                {branch.status ? (STATUS_LABELS[branch.status] ?? branch.status) : "Sin suscripción"}
                {branch.planCode ? ` · ${PLAN_LABELS[branch.planCode] ?? branch.planCode}` : ""}
              </p>
              {branch.cancelAtPeriodEnd ? <p className="admin-copy">Cancelación programada.</p> : null}
              <div className="admin-topbar-actions">
                {active ? (
                  <mc-button disabled={controller.busy} onClick={controller.openPortal}>
                    Gestionar en Stripe
                  </mc-button>
                ) : (
                  PLANS.map((plan) => (
                    <mc-button
                      disabled={controller.busy}
                      key={plan.code}
                      onClick={() => controller.subscribe(branch.branchId, plan.code)}
                      variant={plan.variant}
                    >
                      {plan.label}
                    </mc-button>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
