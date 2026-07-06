import { createFileRoute } from "@tanstack/react-router";

import { BillingView } from "@pages/billing/billing-view";

export const Route = createFileRoute("/_auth/billing")({
  component: BillingView,
});
