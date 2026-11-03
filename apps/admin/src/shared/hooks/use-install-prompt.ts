import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

type InstallMode = "hidden" | "manual" | "prompt";
export type InstallSteps = "ios" | "macSafari" | "browserMenu";

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

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function getMode(): InstallMode {
  if (isStandalone()) return "hidden";
  if (deferredPrompt) return "prompt";
  // Desktop Firefox cannot install sites, so there are no steps to show.
  if (/Firefox/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent)) return "hidden";
  // Only Chromium fires `beforeinstallprompt`, and Brave often holds it back: the browser menu still installs.
  return "manual";
}

export function getInstallSteps(): InstallSteps {
  if (isIos()) return "ios";
  const agent = navigator.userAgent;
  // Brave and every other Chromium browser also say "Safari"; only real Safari lacks the Chromium tokens.
  return /Macintosh/.test(agent) && /Safari/.test(agent) && !/Chrome|Chromium|CriOS|Edg|Firefox/.test(agent)
    ? "macSafari"
    : "browserMenu";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function install(): void {
  const prompt = deferredPrompt;
  if (!prompt) return;
  // The event is single-use, whatever the user answers.
  publish(null);
  void prompt.prompt();
}

export function useInstallPrompt(): { install: () => void; mode: InstallMode } {
  const mode = useSyncExternalStore(subscribe, getMode);

  return { install, mode };
}
