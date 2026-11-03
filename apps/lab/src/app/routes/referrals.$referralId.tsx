import { createFileRoute } from "@tanstack/react-router";

import { ReferralPage } from "~/features/referrals/referral-page";

export const Route = createFileRoute("/referrals/$referralId")({
  component: function ReferralRoute() {
    return <ReferralPage referralId={Route.useParams().referralId} />;
  },
});
