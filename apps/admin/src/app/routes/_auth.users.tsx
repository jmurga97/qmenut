import { canManageUsers } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { UsersPage } from "~/features/users/pages/users-page";

export const Route = createFileRoute("/_auth/users")({
  beforeLoad: ({ context }) => {
    if (!canManageUsers(context.roleCode, context.session?.user.email ?? "")) redirect({ to: "/", throw: true });
  },
  component: UsersPage,
});
