import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/menu/")({
  beforeLoad: () => {
    redirect({ to: "/menu/dishes", replace: true, throw: true });
  },
});
