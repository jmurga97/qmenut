import { createFileRoute } from "@tanstack/react-router";

import { DishesIndex } from "~/features/menu/pages/menu-pages";

export const Route = createFileRoute("/_auth/menu/dishes/")({
  component: DishesIndex,
});
