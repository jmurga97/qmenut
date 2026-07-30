import { createFileRoute } from "@tanstack/react-router";

import { QrPage } from "~/features/qr/pages/qr-page";

export const Route = createFileRoute("/_auth/qr")({
  component: QrPage,
});
