import { useEffect } from "react";

import { track } from "~/lib/analytics/posthog";

import type { RefObject } from "react";

type ContactActionChannel = "map" | "phone" | "social" | "whatsapp";

const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "linkedin.com",
  "pinterest.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtu.be",
  "youtube.com",
];

function isSocialHost(hostname: string): boolean {
  return SOCIAL_HOSTS.some((social) => hostname === social || hostname.endsWith(`.${social}`));
}

/** Clasifica el canal de intención desde el href; `null` para enlaces sin señal (p. ej. OSM). */
function contactChannel(href: string): ContactActionChannel | null {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }

  if (url.protocol === "tel:") {
    return "phone";
  }

  const host = url.hostname.toLowerCase();

  if (host === "wa.me" || host.endsWith(".wa.me") || host.includes("whatsapp")) {
    return "whatsapp";
  }

  if (host.endsWith(".google.com") && url.pathname.startsWith("/maps")) {
    return "map";
  }

  if (isSocialHost(host)) {
    return "social";
  }

  return null;
}

/**
 * Los enlaces de teléfono, WhatsApp, mapa y redes viven dentro del shadow DOM de
 * `qm-location`, `qm-map` y `qm-social-links`; la delegación con `composedPath()` captura
 * sus clicks sin acoplar el paquete de UI a la analítica.
 */
export function useContactActionTracking(hostRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    function handleClick(event: MouseEvent) {
      const anchor = event.composedPath().find((node) => node instanceof HTMLAnchorElement);

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const channel = contactChannel(anchor.getAttribute("href") ?? "");

      if (channel) {
        track("contact_action_tapped", { channel });
      }
    }

    host.addEventListener("click", handleClick);
    return () => host.removeEventListener("click", handleClick);
  }, [hostRef]);
}
