import { createFileRoute } from "@tanstack/react-router";

import { serveMonogramIcon } from "~/server/pwa/monogram-icon";

export const Route = createFileRoute("/icon.svg")({
  server: {
    handlers: {
      GET: () => serveMonogramIcon(false),
    },
  },
});
