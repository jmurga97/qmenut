import { use, useCallback, useSyncExternalStore } from "react";
import { browser } from "react-dom";

const VALUE_CHANGE_EVENT = "qm-stored-string-change";
const snapshots = new Map<string, string | null>();

function readValue(key: string): string | null {
  const cached = snapshots.get(key);
  if (cached !== undefined || snapshots.has(key)) return cached ?? null;

  try {
    const value = window.localStorage.getItem(key);
    snapshots.set(key, value);
    return value;
  } catch {
    snapshots.set(key, null);
    return null;
  }
}

function writeValue(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Keep the value available for this page session when browser storage is unavailable.
  }

  snapshots.set(key, value);
  window.dispatchEvent(new CustomEvent(VALUE_CHANGE_EVENT, { detail: key }));
}

interface StoredString {
  value: string | null;
  setValue: (value: string | null) => void;
}

/** A per-browser string in localStorage, shared by every hook reading the same key and other tabs. */
export function useStoredString(key: string): StoredString {
  use(browser("This value is stored in this browser."));
  const subscribe = useCallback(
    (listener: () => void) => {
      function handleStorage(event: StorageEvent): void {
        if (event.key !== key) return;
        snapshots.set(key, event.newValue);
        listener();
      }

      function handleChange(event: Event): void {
        if ((event as CustomEvent<string>).detail === key) listener();
      }

      window.addEventListener("storage", handleStorage);
      window.addEventListener(VALUE_CHANGE_EVENT, handleChange);

      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(VALUE_CHANGE_EVENT, handleChange);
      };
    },
    [key],
  );
  const getSnapshot = useCallback((): string | null => readValue(key), [key]);

  return {
    value: useSyncExternalStore(subscribe, getSnapshot),
    setValue: useCallback((value: string | null) => writeValue(key, value), [key]),
  };
}
