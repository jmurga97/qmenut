import { createFileRoute } from "@tanstack/react-router";

import { PromotionEditorView } from "@pages/promotions/promotion-editor-view";

export const Route = createFileRoute("/_auth/promotions/$promotionId")({
  component: PromotionEditorRoute,
});

function PromotionEditorRoute() {
  const { promotionId } = Route.useParams();
  return <PromotionEditorView promotionId={promotionId} />;
}
