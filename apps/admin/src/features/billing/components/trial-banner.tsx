import { InlineMessage } from "@jmurga97/components";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";

import { getBillingOverviewQueryOptions } from "../api";

const DAY_MS = 86_400_000;

/** Owners of a demo or a staff-activated plan see how long is left, and a way to pay once it is over. */
export function TrialBanner() {
  const { data } = useQuery(getBillingOverviewQueryOptions({ trpc }));
  // Days left only needs to be right when the panel opens.
  const [now] = useState(Date.now);
  const branch = data?.branches.find((item) => !item.hasStripeSubscription && item.currentPeriodEnd !== null);
  if (!branch?.currentPeriodEnd) return null;

  const link = (
    <Link className="admin-link" to="/billing">
      {i18n.t("billing___Activar plan")}
    </Link>
  );

  if (branch.status === "canceled" || !branch.isActive) {
    return (
      <InlineMessage className="admin-trial-banner" tone="error" title={i18n.t("billing___Tu menú no está publicado")}>
        {i18n.t("billing___Terminó tu periodo. Activa tu plan para volver a publicarlo; no hemos borrado nada.")} {link}
      </InlineMessage>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((branch.currentPeriodEnd - now) / DAY_MS));
  const message =
    branch.status === "trialing"
      ? i18n.t("billing___Te quedan {{count}} días de prueba.", { count: daysLeft })
      : i18n.t("billing___Tu plan vence en {{count}} días.", { count: daysLeft });
  // A paid manual plan only needs a nudge near its end.
  if (branch.status === "active" && daysLeft > 7) return null;

  return (
    <InlineMessage className="admin-trial-banner" tone={daysLeft <= 5 ? "warning" : "info"}>
      {message} {link}
    </InlineMessage>
  );
}
