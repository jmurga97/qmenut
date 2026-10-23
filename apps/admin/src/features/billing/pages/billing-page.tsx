import { Button } from "@jmurga97/components";
import { PLAN_CODES } from "@qmenut/permissions";
import { Suspense } from "react";

import { i18n } from "~/lib/i18n";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";

import { useBillingController } from "../hooks/use-billing-controller";

import type { PlanCode } from "@qmenut/permissions";

const STATUS_LABELS: Record<string, string> = {
  trialing: i18n.t("billing___En prueba"),
  active: i18n.t("billing___Activa"),
  past_due: i18n.t("billing___Pago pendiente"),
  canceled: i18n.t("billing___Cancelada"),
};
const PLAN_LABELS: Record<PlanCode, string> = {
  basic: i18n.t("billing___Básico"),
  business: i18n.t("billing___Business"),
};
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
interface PlanActionInput {
  planCode: PlanCode;
  subscribed: boolean;
  /** A branch that already had a Stripe subscription gets no second trial. */
  hadSubscription: boolean;
}

function planActionLabel({ planCode, subscribed, hadSubscription }: PlanActionInput): string {
  const plan = PLAN_LABELS[planCode];
  if (subscribed) return i18n.t("billing___Cambiar a {{plan}}", { plan });
  if (hadSubscription) return i18n.t("billing___Suscribir {{plan}}", { plan });
  return i18n.t("billing___Probar {{plan}} 14 días", { plan });
}

function BillingBranches() {
  const controller = useBillingController();
  // Basic is a single-location plan; the API refuses it too.
  const multiBranch = controller.overview.branches.length > 1;
  return (
    <>
      {multiBranch ? (
        <p className="admin-copy">{i18n.t("billing___Con varias sucursales, cada una necesita el plan Business.")}</p>
      ) : null}
      <div className="admin-page-grid">
        {controller.overview.branches.map((branch) => {
          const subscribed = branch.hasStripeSubscription && branch.status !== "canceled";
          return (
            <section className="admin-card" key={branch.branchId}>
              <h3 className="admin-list-label">{branch.branchName}</h3>
              <p className="admin-list-meta">
                {branch.status ? (STATUS_LABELS[branch.status] ?? branch.status) : i18n.t("billing___Sin suscripción")}
                {branch.planCode ? ` · ${PLAN_LABELS[branch.planCode]}` : ""}
              </p>
              {branch.cancelAtPeriodEnd ? (
                <p className="admin-copy">{i18n.t("billing___Cancelación programada.")}</p>
              ) : null}
              <div className="admin-topbar-actions">
                {PLAN_CODES.filter((planCode) => !subscribed || planCode !== branch.planCode).map((planCode) => {
                  const label = planActionLabel({
                    planCode,
                    subscribed,
                    hadSubscription: branch.hasStripeSubscription,
                  });
                  return (
                    <Button
                      aria-label={i18n.t("billing___{{plan}} para {{branch}}", {
                        plan: label,
                        branch: branch.branchName,
                      })}
                      disabled={controller.busy || (planCode === "basic" && multiBranch)}
                      key={planCode}
                      onClick={() =>
                        subscribed
                          ? controller.changePlan(branch.branchId, planCode)
                          : controller.subscribe(branch.branchId, planCode)
                      }
                      variant={planCode === "business" ? "primary" : "secondary"}
                    >
                      {label}
                    </Button>
                  );
                })}
                {subscribed ? (
                  <Button
                    aria-label={i18n.t("billing___Gestionar {{branch}} en Stripe", { branch: branch.branchName })}
                    disabled={controller.busy}
                    onClick={controller.openPortal}
                    variant={"ghost"}
                  >
                    {i18n.t("billing___Gestionar en Stripe")}
                  </Button>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
