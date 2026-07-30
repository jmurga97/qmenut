import { createFileRoute } from "@tanstack/react-router";

import { LoyaltyLayout } from "~/features/loyalty/pages/loyalty-layout";

export const Route = createFileRoute("/_auth/loyalty")({
  component: LoyaltyLayout,
});
