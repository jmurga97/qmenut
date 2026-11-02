import { createFileRoute } from "@tanstack/react-router";

import { OfferPage } from "~/features/offer/offer-page";

/** Invitation link from a campaign email; the code is the batch recipient's opaque id. */
export const Route = createFileRoute("/i/$code")({
  component: function InvitationRoute() {
    return <OfferPage code={Route.useParams().code} />;
  },
});
