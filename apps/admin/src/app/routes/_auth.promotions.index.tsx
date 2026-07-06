import { createFileRoute } from "@tanstack/react-router";

import { PromotionsListView } from "@pages/promotions/promotions-list-view";

export const Route = createFileRoute("/_auth/promotions/")({
  component: PromotionsListView,
});
