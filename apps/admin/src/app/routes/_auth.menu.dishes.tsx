import { createFileRoute } from "@tanstack/react-router";

import { DishesLayout } from "~/features/menu/pages/menu-pages";

export const Route = createFileRoute("/_auth/menu/dishes")({
  component: DishesLayout,
});
