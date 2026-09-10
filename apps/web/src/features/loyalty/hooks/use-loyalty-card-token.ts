import { use, useCallback, useSyncExternalStore } from "react";
import { browser } from "react-dom";

const TOKEN_CHANGE_EVENT = "qm-loyalty-card-token-change";
const tokenSnapshots = new Map<string, string | null>();

function storageKey(host: string): string {
  return `qm-loyalty-card:${host}`;
}

function readToken(key: string): string | null {
  const cached = tokenSnapshots.get(key);
  if (cached !== undefined || tokenSnapshots.has(key)) return cached ?? null;

  try {
    const token = window.localStorage.getItem(key);
    tokenSnapshots.set(key, token);
    return token;
  } catch {
    tokenSnapshots.set(key, null);
    return null;
  }
}

function publishToken(key: string, token: string | null): void {
  tokenSnapshots.set(key, token);
  window.dispatchEvent(new CustomEvent(TOKEN_CHANGE_EVENT, { detail: key }));
}

function writeToken(key: string, token: string | null): void {
  try {
    if (token === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, token);
  } catch {
    // Keep the token available for this page session when browser storage is unavailable.
  }

  publishToken(key, token);
}

interface LoyaltyCardTokenState {
  clearToken: () => void;
  setToken: (token: string) => void;
  token: string | null;
}

export function useLoyaltyCardToken(host: string): LoyaltyCardTokenState {
  use(browser("The loyalty card token is stored in this browser."));
  const key = storageKey(host);
  const subscribe = useCallback(
    (listener: () => void) => {
      function handleStorage(event: StorageEvent): void {
        if (event.key !== key) return;
        tokenSnapshots.set(key, event.newValue);
        listener();
      }

      function handleTokenChange(event: Event): void {
        if ((event as CustomEvent<string>).detail === key) listener();
      }

      window.addEventListener("storage", handleStorage);
      window.addEventListener(TOKEN_CHANGE_EVENT, handleTokenChange);

      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(TOKEN_CHANGE_EVENT, handleTokenChange);
      };
    },
    [key],
  );
  const getSnapshot = useCallback((): string | null => readToken(key), [key]);
  const token = useSyncExternalStore(subscribe, getSnapshot);

  return {
    clearToken: useCallback(() => writeToken(key, null), [key]),
    setToken: useCallback((nextToken: string) => writeToken(key, nextToken), [key]),
    token,
  };
}
