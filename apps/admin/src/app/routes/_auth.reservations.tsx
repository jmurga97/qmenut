import { createFileRoute, redirect } from "@tanstack/react-router";

import { ReservationsLayout } from "~/features/reservations/pages/reservations-layout";
import { FEATURES } from "~/lib/features";

export const Route = createFileRoute("/_auth/reservations")({
  beforeLoad: () => {
    if (!FEATURES.reservations) redirect({ to: "/", throw: true });
  },
  component: ReservationsLayout,
});
