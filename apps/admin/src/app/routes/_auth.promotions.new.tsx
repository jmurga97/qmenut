import { createFileRoute } from "@tanstack/react-router";

import { PromotionEditorView } from "@pages/promotions/promotion-editor-view";

export const Route = createFileRoute("/_auth/promotions/new")({
  component: () => <PromotionEditorView />,
});
