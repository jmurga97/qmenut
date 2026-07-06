import { createFileRoute } from "@tanstack/react-router";

import { BranchSettingsView } from "@pages/branch/branch-settings-view";

export const Route = createFileRoute("/_auth/branch")({
  component: BranchSettingsView,
});
