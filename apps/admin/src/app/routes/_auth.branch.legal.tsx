import { createFileRoute } from "@tanstack/react-router";

import { LegalSection } from "~/features/branch/pages/legal-section";

export const Route = createFileRoute("/_auth/branch/legal")({
  component: LegalSection,
});
