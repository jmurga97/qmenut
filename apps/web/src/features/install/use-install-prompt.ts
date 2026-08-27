import { useCallback, useEffect, useSyncExternalStore } from "react";

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
const SERVER_ENVIRONMENT: InstallEnvironment | undefined = undefined;
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
const environmentStore: {
  initialized: boolean;
  snapshot: InstallEnvironment | undefined;
  listeners: Set<() => void>;
} = {
  initialized: false,
  snapshot: undefined,
  listeners: new Set(),
};

function publish(snapshot: InstallPromptSnapshot): void {
  promptState.snapshot = snapshot;

  for (const listener of listeners) {
    listener();
  }
}

function publishEnvironment(next: InstallEnvironment): void {
  const current = environmentStore.snapshot;

  if (current?.dismissed === next.dismissed && current?.ios === next.ios && current?.standalone === next.standalone) {
    return;
  }

  environmentStore.snapshot = next;

  for (const listener of environmentStore.listeners) {
    listener();
  }
}

function refreshEnvironment(): void {
  if (typeof window === "undefined") {
    return;
  }

  publishEnvironment({
    dismissed: readDismissed(),
    ios: isIos(),
    standalone: isStandalone(),
  });
}

function initializeEnvironmentStore(): void {
  if (environmentStore.initialized || typeof window === "undefined") {
    return;
  }

  environmentStore.initialized = true;

  const displayModeQuery = window.matchMedia("(display-mode: standalone)");

  displayModeQuery.addEventListener("change", refreshEnvironment);
  window.addEventListener("pageshow", refreshEnvironment);

  refreshEnvironment();
}

function subscribeEnvironment(listener: () => void): () => void {
  environmentStore.listeners.add(listener);
  initializeEnvironmentStore();

  return () => environmentStore.listeners.delete(listener);
}

function getEnvironmentSnapshot(): InstallEnvironment | undefined {
  return environmentStore.snapshot;
}

function getServerEnvironmentSnapshot(): InstallEnvironment | undefined {
  return SERVER_ENVIRONMENT;
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
    refreshEnvironment();
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
  const environment = useSyncExternalStore(subscribeEnvironment, getEnvironmentSnapshot, getServerEnvironmentSnapshot);
  const mode = resolveMode(snapshot, environment);

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
    publishEnvironment({
      dismissed: true,
      ios: environmentStore.snapshot?.ios ?? isIos(),
      standalone: environmentStore.snapshot?.standalone ?? isStandalone(),
    });
  }, []);

  const install = useCallback(() => {
    void promptInstall();
  }, []);

  return { dismiss, install, mode };
}
