import { isInternalSupportEmail } from "@qmenut/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { MessagingPage } from "~/features/messaging/pages/messaging-page";

export const Route = createFileRoute("/_auth/messaging")({
  beforeLoad: ({ context }) => {
    if (!isInternalSupportEmail(context.session?.user.email ?? "")) redirect({ to: "/", throw: true });
  },
  component: MessagingPage,
});
