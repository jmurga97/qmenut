import { createFileRoute } from "@tanstack/react-router";

import { CategoryEditorView } from "@pages/menu/category-editor-view";

export const Route = createFileRoute("/_auth/menu/categories/$categoryId")({
  component: CategoryEditorRoute,
});

function CategoryEditorRoute() {
  const { categoryId } = Route.useParams();
  return <CategoryEditorView categoryId={categoryId} />;
}
