import { createFileRoute } from "@tanstack/react-router";

import { BatchPage } from "~/features/campaigns/batch-page";

export const Route = createFileRoute("/batches/$batchId")({
  component: function BatchRoute() {
    return <BatchPage batchId={Route.useParams().batchId} />;
  },
});
