// Must run before anything that imports @qmenut/ui components.
import "~/server/lit-dom-shim";

import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { serveWithEdgeCache } from "~/server/edge-cache";
import { serveWithSentry } from "~/server/sentry";

export default createServerEntry({
  fetch(request) {
    return serveWithSentry(request, () => serveWithEdgeCache(request, () => handler.fetch(request)));
  },
});
