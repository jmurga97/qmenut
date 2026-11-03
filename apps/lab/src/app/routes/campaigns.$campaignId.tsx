import { createFileRoute } from "@tanstack/react-router";

import { CampaignPage } from "~/features/campaigns/campaign-page";

export const Route = createFileRoute("/campaigns/$campaignId")({
  component: function CampaignRoute() {
    return <CampaignPage campaignId={Route.useParams().campaignId} />;
  },
});
