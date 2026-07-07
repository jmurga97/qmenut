import { createFileRoute } from "@tanstack/react-router";

import { QrCodeView } from "@pages/qr/qr-code-view";

export const Route = createFileRoute("/_auth/qr")({
  component: QrCodeView,
});
