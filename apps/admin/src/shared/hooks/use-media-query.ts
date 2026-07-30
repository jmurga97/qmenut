import { useSyncExternalStore } from "react";

function subscribeToMediaQuery(query: string, onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}
function getMediaQuerySnapshot(query: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.matchMedia(query).matches;
}
export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToMediaQuery(query, onStoreChange),
    () => getMediaQuerySnapshot(query, fallback),
    () => fallback,
  );
}
