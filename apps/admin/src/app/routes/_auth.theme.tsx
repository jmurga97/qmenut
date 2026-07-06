import { createFileRoute } from "@tanstack/react-router";

import { ThemeView } from "@pages/theme/theme-view";

export const Route = createFileRoute("/_auth/theme")({
  component: ThemeView,
});
