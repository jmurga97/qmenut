import { i18n } from "~/lib/i18n";
import { isIos, isStandalone } from "~/shared/hooks/use-install-prompt";

import type { NotificationRow } from "~/features/notifications/types";

const SERVICE_WORKER_URL = "/sw.js";

type TrustedTypesRuntime = typeof globalThis & {
  __qmenutServiceWorkerPolicy?: { createScriptURL: (value: string) => string };
  trustedTypes?: {
    createPolicy: (
      name: string,
      rules: { createScriptURL: (value: string) => string },
    ) => { createScriptURL: (value: string) => string };
  };
};

export type PushSupport = "unsupported" | "iosInstall" | "supported";

export function getPushSupport(): PushSupport {
  if (isIos() && !isStandalone()) return "iosInstall";
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    ? "supported"
    : "unsupported";
}

// The admin enforces Trusted Types; this policy only ever lets the push worker script through.
function serviceWorkerUrl(): string {
  const runtime = globalThis as TrustedTypesRuntime;
  if (!runtime.trustedTypes) return SERVICE_WORKER_URL;
  runtime.__qmenutServiceWorkerPolicy ??= runtime.trustedTypes.createPolicy("qmenut-service-worker", {
    createScriptURL: (value) => {
      if (value !== SERVICE_WORKER_URL) throw new TypeError(`Service worker no permitido: ${value}`);
      return value;
    },
  });
  return runtime.__qmenutServiceWorkerPolicy.createScriptURL(SERVICE_WORKER_URL);
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(serviceWorkerUrl(), { scope: "/", updateViaCache: "none" });
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.codePointAt(0) ?? 0);
}

/** Asks for permission (only ever after a tap) and returns the subscription, or null when refused. */
export async function subscribeToPush(publicKey: string): Promise<PushSubscription | null> {
  if ((await Notification.requestPermission()) !== "granted") return null;
  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;
  return (
    (await registration.pushManager.getSubscription()) ??
    registration.pushManager.subscribe({ applicationServerKey: base64UrlToBytes(publicKey), userVisibleOnly: true })
  );
}

export function getSubscriptionKeys(subscription: PushSubscription) {
  const { keys } = subscription.toJSON();
  return { endpoint: subscription.endpoint, keys: { auth: keys?.auth ?? "", p256dh: keys?.p256dh ?? "" } };
}

export function getAdminLanguage(): "es" | "en" {
  return i18n.resolvedLanguage === "en" ? "en" : "es";
}

/** Inbox text is built here, in the admin language, from the event type and its facts. */
export function describeNotification(row: NotificationRow): { title: string; detail: string; url: string | null } {
  const { facts } = row;
  if (row.type === "announcement") {
    const english = getAdminLanguage() === "en";
    return {
      title: String((english ? facts.titleEn : facts.titleEs) ?? ""),
      detail: String((english ? facts.bodyEn : facts.bodyEs) ?? ""),
      url: typeof facts.url === "string" ? facts.url : null,
    };
  }
  if (row.type === "loyalty.redemption") {
    return {
      title: i18n.t("notifications___Canje pendiente"),
      detail: i18n.t("notifications___{{reward}} · {{cost}} sellos", { reward: facts.rewardName, cost: facts.cost }),
      url: "/loyalty",
    };
  }
  if (row.type === "loyalty.stampRequest") {
    return {
      title: i18n.t("notifications___Solicitud de sellos"),
      detail: i18n.t("notifications___Solicitud de {{count}} sellos", { count: facts.quantity }),
      url: "/loyalty",
    };
  }
  return { title: row.type, detail: "", url: null };
}

export function describeHandled(row: NotificationRow): string | null {
  if (row.handledAt === null) return null;
  const name = row.handledByName;
  switch (row.handledOutcome ?? "") {
    case "validated":
      return name ? i18n.t("notifications___Validado por {{name}}", { name }) : i18n.t("notifications___Validado");
    case "accepted":
      return name ? i18n.t("notifications___Aceptado por {{name}}", { name }) : i18n.t("notifications___Aceptado");
    case "rejected":
    case "declined":
      return name ? i18n.t("notifications___Rechazado por {{name}}", { name }) : i18n.t("notifications___Rechazado");
    case "cancelled":
      return i18n.t("notifications___Cancelado por el cliente");
    case "expired":
      return i18n.t("notifications___Caducado");
    case "autoAccepted":
      return i18n.t("notifications___Aceptado automáticamente");
    default:
      return i18n.t("notifications___Resuelto");
  }
}

export function formatNotificationTime(value: number): string {
  return new Intl.DateTimeFormat(getAdminLanguage(), { dateStyle: "short", timeStyle: "short" }).format(value);
}
