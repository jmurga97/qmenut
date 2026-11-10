import { Button } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
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

// Placeholder until the real sales line exists; same number as the landing's Venezuelan WhatsApp.
const VENEZUELA_SALES_WHATSAPP = "584120000000";
const dateFormat = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "long", year: "numeric" });

function whatsappActivationUrl(restaurantName: string): string {
  const text = i18n.t("billing___Hola, quiero activar el plan de {{restaurant}} en QMenut.", {
    restaurant: restaurantName,
  });
  return `https://wa.me/${VENEZUELA_SALES_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function BillingBranches() {
  const controller = useBillingController();
  const { overview } = controller;
  // Basic is a single-location plan; the API refuses it too.
  const multiBranch = overview.branches.length > 1;
  // Stripe does not serve Venezuela: the team activates the plan after a direct payment.
  const paysTeam = overview.countryCode === "VEN";
  const currency = paysTeam ? "$" : "€";
  return (
    <>
      {multiBranch ? (
        <p className="admin-copy">{i18n.t("billing___Con varias sucursales, cada una necesita el plan Business.")}</p>
      ) : null}
      {overview.founderSlotsLeft > 0 ? (
        <p className="admin-copy">
          {i18n.t(
            "billing___Precio founder: Business a {{price}} al mes el primer año. Quedan {{count}} de 100 plazas.",
            { price: `39 ${currency}`, count: overview.founderSlotsLeft },
          )}
        </p>
      ) : null}
      {paysTeam ? (
        <p className="admin-copy">
          {i18n.t("billing___En Venezuela activamos tu plan por WhatsApp: Zelle, Binance o Pago Móvil.")}
        </p>
      ) : null}
      <div className="admin-page-grid">
        {overview.branches.map((branch) => {
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
              {!branch.hasStripeSubscription && branch.currentPeriodEnd ? (
                <p className="admin-copy">
                  {i18n.t("billing___Hasta el {{date}}", { date: dateFormat.format(branch.currentPeriodEnd) })}
                </p>
              ) : null}
              {paysTeam ? (
                <div className="admin-topbar-actions">
                  <a
                    className={buttonVariants({ variant: "primary" })}
                    href={whatsappActivationUrl(branch.branchName)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {i18n.t("billing___Activar por WhatsApp")}
                  </a>
                </div>
              ) : (
                <div className="admin-topbar-actions">
                  {PLAN_CODES.filter((planCode) => !subscribed || planCode !== branch.planCode).map((planCode) => {
                    const label = planActionLabel({
                      planCode,
                      subscribed,
                      // A demo or staff-activated plan already had its free days.
                      hadSubscription: branch.hasStripeSubscription || branch.currentPeriodEnd !== null,
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
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
