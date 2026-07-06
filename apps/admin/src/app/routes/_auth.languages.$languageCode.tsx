import { createFileRoute } from "@tanstack/react-router";

import { TranslationsEditorView } from "@pages/languages/translations-editor-view";

export const Route = createFileRoute("/_auth/languages/$languageCode")({
  component: TranslationsEditorRoute,
});

function TranslationsEditorRoute() {
  const { languageCode } = Route.useParams();

  return <TranslationsEditorView languageCode={languageCode} />;
}
