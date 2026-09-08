import { createFileRoute } from "@tanstack/react-router";

import { ScheduleSection } from "~/features/branch/pages/schedule-section";

export const Route = createFileRoute("/_auth/branch/horario")({
  component: ScheduleSection,
});
