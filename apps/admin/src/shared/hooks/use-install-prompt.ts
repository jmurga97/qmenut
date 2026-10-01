import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

type InstallMode = "hidden" | "ios" | "prompt";

const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function publish(next: BeforeInstallPromptEvent | null): void {
  deferredPrompt = next;
  for (const listener of listeners) listener();
}

// Must run before React mounts: `beforeinstallprompt` fires once, often before the first render.
export function captureInstallPrompt(): void {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    publish(event as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => publish(null));
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

function getMode(): InstallMode {
  if (isStandalone()) return "hidden";
  if (deferredPrompt) return "prompt";
  // iOS never fires `beforeinstallprompt`; the user has to follow the manual steps.
  return isIos() ? "ios" : "hidden";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallPrompt(): { install: () => void; mode: InstallMode } {
  const mode = useSyncExternalStore(subscribe, getMode);

  function install(): void {
    const prompt = deferredPrompt;
    if (!prompt) return;
    // The event is single-use, whatever the user answers.
    publish(null);
    void prompt.prompt();
  }

  return { install, mode };
}
