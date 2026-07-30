import { createFileRoute } from "@tanstack/react-router";

import { CategoryEditorPage } from "~/features/menu/pages/menu-pages";

export const Route = createFileRoute("/_auth/menu/categories/$categoryId")({
  component: function CategoryRoute() {
    return <CategoryEditorPage categoryId={Route.useParams().categoryId} />;
  },
});
