import { createFileRoute } from "@tanstack/react-router";

import { GeneralSection } from "~/features/branch/pages/general-section";

export const Route = createFileRoute("/_auth/branch/")({
  component: GeneralSection,
});
