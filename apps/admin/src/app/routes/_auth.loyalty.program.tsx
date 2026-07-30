import { can } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoyaltyProgramPage } from "~/features/loyalty/pages/loyalty-program-page";

export const Route = createFileRoute("/_auth/loyalty/program")({
  beforeLoad: ({ context }) => {
    if (!can(context.roleCode, "loyalty.manage")) redirect({ to: "/loyalty", throw: true });
  },
  component: LoyaltyProgramPage,
});
