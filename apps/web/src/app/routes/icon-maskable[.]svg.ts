import { createFileRoute } from "@tanstack/react-router";

import { serveMonogramIcon } from "~/server/pwa/monogram-icon";

export const Route = createFileRoute("/icon-maskable.svg")({
  server: {
    handlers: {
      GET: () => serveMonogramIcon(true),
    },
  },
});
