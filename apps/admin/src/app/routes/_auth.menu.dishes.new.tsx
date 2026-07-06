import { createFileRoute } from "@tanstack/react-router";

import { DishEditorView } from "@pages/menu/dish-editor-view";

export const Route = createFileRoute("/_auth/menu/dishes/new")({
  component: () => <DishEditorView />,
});
