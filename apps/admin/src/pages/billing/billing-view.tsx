import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@lib/errors";
import { trpc } from "@lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  trialing: "En prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Básico",
  business: "Business",
};

export function BillingView() {
  const [error, setError] = useState<string | null>(null);
  const { data: overview } = useSuspenseQuery(trpc.admin.billing.overview.queryOptions());
  const checkoutMutation = useMutation(trpc.admin.billing.checkout.mutationOptions());
  const portalMutation = useMutation(trpc.admin.billing.portal.mutationOptions());
  const busy = checkoutMutation.isPending || portalMutation.isPending;

  async function subscribe(branchId: string, planCode: "basic" | "business") {
    setError(null);
    try {
      const { url } = await checkoutMutation.mutateAsync({ branchId, planCode });
      window.location.assign(url);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  async function openPortal() {
    setError(null);
    try {
      const { url } = await portalMutation.mutateAsync();
      window.location.assign(url);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">Facturación</div>
        <h2>Suscripción</h2>
        <p>Cada sucursal se factura por separado. Elige un plan o gestiona el pago desde el portal de Stripe.</p>
      </header>

      {error ? <mc-inline-message message={error} tone="error" /> : null}

      <div className="admin-page-grid">
        {overview.branches.map((branch) => {
          const active = branch.status === "active" || branch.status === "trialing";
          return (
            <section className="admin-card" key={branch.branchId}>
              <div className="admin-toolbar">
                <div>
                  <div className="admin-kicker">Sucursal</div>
                  <strong className="admin-list-label">{branch.branchName}</strong>
                </div>
                <span className="admin-list-meta">
                  {branch.status ? (STATUS_LABELS[branch.status] ?? branch.status) : "Sin suscripción"}
                  {branch.planCode ? ` · ${PLAN_LABELS[branch.planCode] ?? branch.planCode}` : ""}
                </span>
              </div>

              {branch.cancelAtPeriodEnd ? (
                <p className="admin-copy">La suscripción se cancelará al final del periodo actual.</p>
              ) : null}

              {active ? (
                <div className="admin-topbar-actions">
                  <mc-button disabled={busy} onClick={() => void openPortal()} variant="secondary">
                    Gestionar en Stripe
                  </mc-button>
                </div>
              ) : (
                <div className="admin-topbar-actions">
                  <mc-button
                    disabled={busy}
                    onClick={() => void subscribe(branch.branchId, "basic")}
                    variant="secondary"
                  >
                    Suscribir Básico
                  </mc-button>
                  <mc-button
                    disabled={busy}
                    onClick={() => void subscribe(branch.branchId, "business")}
                    variant="primary"
                  >
                    Suscribir Business
                  </mc-button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
