import { createFileRoute } from "@tanstack/react-router";

import { ReservationsLayout } from "~/features/reservations/pages/reservations-layout";

export const Route = createFileRoute("/_auth/reservations")({
  component: ReservationsLayout,
});
