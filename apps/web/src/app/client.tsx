// Installs LitElement hydration support before any route can import @qmenut/ui components.
import "@lit-labs/ssr-react/enable-lit-ssr.js";

import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

import { registerServiceWorker } from "~/app/register-sw";
import { initInstallPromptCapture } from "~/features/install/use-install-prompt";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

const MAX_EARLY_SENTRY_ERRORS = 20;
const earlySentryErrors: unknown[] = [];

function queueEarlyError(error: unknown): void {
  if (earlySentryErrors.length < MAX_EARLY_SENTRY_ERRORS) {
    earlySentryErrors.push(error);
  }
}

function handleEarlyWindowError(event: ErrorEvent): void {
  queueEarlyError(event.error ?? event.message);
}

function handleEarlyUnhandledRejection(event: PromiseRejectionEvent): void {
  queueEarlyError(event.reason);
}

function stopEarlyErrorCapture(): void {
  window.removeEventListener("error", handleEarlyWindowError);
  window.removeEventListener("unhandledrejection", handleEarlyUnhandledRejection);
}

function scheduleSentryLoad(): void {
  if (!sentryDsn) return;

  const load = async () => {
    const Sentry = await import("@sentry/react");

    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });

    const queuedErrors = [...earlySentryErrors];
    earlySentryErrors.length = 0;

    for (const error of queuedErrors) {
      Sentry.captureException(error);
    }

    stopEarlyErrorCapture();
  };

  const startLoad = () => {
    void load().catch(() => {
      stopEarlyErrorCapture();
      earlySentryErrors.length = 0;
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(startLoad, { timeout: 5000 });
  } else {
    setTimeout(startLoad, 1500);
  }
}

if (sentryDsn) {
  window.addEventListener("error", handleEarlyWindowError);
  window.addEventListener("unhandledrejection", handleEarlyUnhandledRejection);
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

  scheduleSentryLoad();
});

registerServiceWorker();
