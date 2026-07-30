import { createFileRoute } from "@tanstack/react-router";

import { getPromotionQueryOptions } from "~/features/promotions/api";
import { PromotionEditorPage } from "~/features/promotions/pages/promotion-pages";

export const Route = createFileRoute("/_auth/promotions/$promotionId")({
  loader: async ({ context, params }) => {
    if (!context.promotionsBranchId) return;
    await context.queryClient.ensureQueryData(
      getPromotionQueryOptions({ promotionId: params.promotionId, trpc: context.trpc }),
    );
  },
  component: function PromotionRoute() {
    return <PromotionEditorPage promotionId={Route.useParams().promotionId} />;
  },
});
