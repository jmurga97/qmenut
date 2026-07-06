import { createFileRoute } from "@tanstack/react-router";

import { DishEditorView } from "@pages/menu/dish-editor-view";

export const Route = createFileRoute("/_auth/menu/dishes/$dishId")({
  component: DishEditorRoute,
});

function DishEditorRoute() {
  const { dishId } = Route.useParams();
  return <DishEditorView dishId={dishId} />;
}
