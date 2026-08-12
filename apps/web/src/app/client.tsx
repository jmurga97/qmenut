// Installs LitElement hydration support before any route can import @qmenut/ui components.
import "@lit-labs/ssr-react/enable-lit-ssr.js";

import * as Sentry from "@sentry/react";
import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

import { registerServiceWorker } from "~/app/register-sw";
import { initInstallPromptCapture } from "~/features/install/use-install-prompt";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

// Must run before hydration: `beforeinstallprompt` fires once, and often before React mounts.
initInstallPromptCapture();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});

registerServiceWorker();
