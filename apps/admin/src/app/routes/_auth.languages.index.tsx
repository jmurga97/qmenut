import { createFileRoute } from "@tanstack/react-router";

import { LanguagesSettingsView } from "@pages/languages/languages-settings-view";

export const Route = createFileRoute("/_auth/languages/")({
  component: LanguagesSettingsView,
});
