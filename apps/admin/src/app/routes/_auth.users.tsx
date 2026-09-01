import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { UsersPage } from "~/features/users/pages/users-page";

export const Route = createFileRoute("/_auth/users")({
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "users.manage")) redirect({ to: "/", throw: true });
  },
  component: UsersPage,
});
