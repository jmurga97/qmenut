import { createFileRoute } from "@tanstack/react-router";

import { ReservationsClosuresPage } from "~/features/reservations/pages/reservations-closures-page";

export const Route = createFileRoute("/_auth/reservations/closures")({
  component: ReservationsClosuresPage,
});
