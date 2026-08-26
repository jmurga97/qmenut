import { createFileRoute, redirect } from "@tanstack/react-router";

import { SelectRestaurantPage } from "~/features/auth/pages/select-restaurant-page";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/select-restaurant")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      redirect({ to: "/login", throw: true });
    }
  },
  component: SelectRestaurantPage,
});
