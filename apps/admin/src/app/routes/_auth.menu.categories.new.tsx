import { createFileRoute } from "@tanstack/react-router";

import { CategoryEditorView } from "@pages/menu/category-editor-view";

export const Route = createFileRoute("/_auth/menu/categories/new")({
  component: () => <CategoryEditorView />,
});
