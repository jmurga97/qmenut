import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { track } from "~/lib/analytics/posthog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptSnapshot {
  canPrompt: boolean;
  installed: boolean;
}

interface InstallEnvironment {
  dismissed: boolean;
  ios: boolean;
  standalone: boolean;
}

export type InstallMode = "hidden" | "ios-instructions" | "prompt";

const DISMISSED_STORAGE_KEY = "qm-install-dismissed";
const SERVER_SNAPSHOT: InstallPromptSnapshot = { canPrompt: false, installed: false };
const listeners = new Set<() => void>();
const promptState: {
  captureInitialized: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  shownTracked: boolean;
  snapshot: InstallPromptSnapshot;
} = {
  captureInitialized: false,
  deferredPrompt: null,
  shownTracked: false,
  snapshot: SERVER_SNAPSHOT,
};

function publish(snapshot: InstallPromptSnapshot): void {
  promptState.snapshot = snapshot;

  for (const listener of listeners) {
    listener();
  }
}

export function initInstallPromptCapture(): void {
  if (promptState.captureInitialized || typeof window === "undefined") {
    return;
  }

  promptState.captureInitialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptState.deferredPrompt = event as BeforeInstallPromptEvent;
    publish({ canPrompt: true, installed: false });
  });

  window.addEventListener("appinstalled", () => {
    promptState.deferredPrompt = null;
    track("pwa_installed");
    publish({ canPrompt: false, installed: true });
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function resolveMode(snapshot: InstallPromptSnapshot, environment: InstallEnvironment | undefined): InstallMode {
  if (!environment || environment.dismissed || environment.standalone || snapshot.installed) {
    return "hidden";
  }

  if (snapshot.canPrompt) {
    return "prompt";
  }

  return environment.ios ? "ios-instructions" : "hidden";
}

async function promptInstall(): Promise<void> {
  const prompt = promptState.deferredPrompt;

  if (!prompt) {
    return;
  }

  promptState.deferredPrompt = null;
  publish({ ...promptState.snapshot, canPrompt: false });

  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    track(outcome === "accepted" ? "pwa_install_prompt_accepted" : "pwa_install_prompt_dismissed");
  } catch (error) {
    console.error("Install prompt failed", error);
  }
}

export interface UseInstallPromptResult {
  dismiss: () => void;
  install: () => void;
  mode: InstallMode;
}

export function useInstallPrompt(): UseInstallPromptResult {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => promptState.snapshot,
    () => SERVER_SNAPSHOT,
  );
  const [environment, setEnvironment] = useState<InstallEnvironment>();
  const mode = resolveMode(snapshot, environment);

  useEffect(() => {
    setEnvironment({ dismissed: readDismissed(), ios: isIos(), standalone: isStandalone() });
  }, []);

  useEffect(() => {
    if (mode === "hidden" || promptState.shownTracked) {
      return;
    }

    promptState.shownTracked = true;
    track("pwa_install_card_shown", { mode });
  }, [mode]);

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, "1");
    } catch {
      // Keep the in-memory dismissal below when storage is unavailable.
    }

    track("pwa_install_card_dismissed");
    setEnvironment((current) => current && { ...current, dismissed: true });
  }, []);

  const install = useCallback(() => {
    void promptInstall();
  }, []);

  return { dismiss, install, mode };
}
