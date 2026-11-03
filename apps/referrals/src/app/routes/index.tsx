import { createFileRoute } from "@tanstack/react-router";

import { OfferPage } from "~/features/offer/offer-page";

export const Route = createFileRoute("/")({ component: () => <OfferPage /> });
