import { createFileRoute } from "@tanstack/react-router";

import { OverviewView } from "@pages/overview/overview-view";

export const Route = createFileRoute("/_auth/")({
  component: OverviewView,
});
