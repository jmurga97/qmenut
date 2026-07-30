import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginPage } from "~/features/auth/pages/login-page";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) {
      redirect({ to: "/", throw: true });
    }
  },
  component: LoginPage,
});
