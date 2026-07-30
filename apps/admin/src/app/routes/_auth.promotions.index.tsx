import { createFileRoute } from "@tanstack/react-router";

import { PromotionsListPage } from "~/features/promotions/pages/promotion-pages";

export const Route = createFileRoute("/_auth/promotions/")({
  component: PromotionsListPage,
});
