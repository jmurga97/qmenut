import { createFileRoute } from "@tanstack/react-router";

import { ReservationsSettingsPage } from "~/features/reservations/pages/reservations-settings-page";

export const Route = createFileRoute("/_auth/reservations/settings")({
  component: ReservationsSettingsPage,
});
