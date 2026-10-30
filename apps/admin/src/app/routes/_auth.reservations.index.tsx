import { createFileRoute } from "@tanstack/react-router";

import { ReservationsDayPage } from "~/features/reservations/pages/reservations-day-page";
import { reservationsSearchSchema } from "~/features/reservations/types";

export const Route = createFileRoute("/_auth/reservations/")({
  validateSearch: reservationsSearchSchema,
  component: ReservationsDayPage,
});
