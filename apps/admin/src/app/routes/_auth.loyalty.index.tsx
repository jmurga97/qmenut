import { createFileRoute } from "@tanstack/react-router";

import { LoyaltyOperationsPage } from "~/features/loyalty/pages/loyalty-operations-page";

export const Route = createFileRoute("/_auth/loyalty/")({
  component: LoyaltyOperationsPage,
});
