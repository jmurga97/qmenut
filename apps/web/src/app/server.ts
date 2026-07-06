// Must run before anything that imports @qmenut/ui components.
import "~/server/lit-dom-shim";

import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});
