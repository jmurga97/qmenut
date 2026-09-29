import { createFileRoute } from "@tanstack/react-router";

import { CategoriesIndex } from "~/features/menu/pages/menu-pages";

export const Route = createFileRoute("/_auth/menu/categories/")({
  component: CategoriesIndex,
});
