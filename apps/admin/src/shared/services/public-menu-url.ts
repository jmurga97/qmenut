const LOCAL_ADMIN_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export function buildPublicMenuUrl(publicHost: string, adminHost = window.location.hostname) {
  const isLocalAdmin = LOCAL_ADMIN_HOSTS.has(adminHost) || adminHost.endsWith(".localhost");
  const localPublicMenuPort = import.meta.env.VITE_PUBLIC_MENU_PORT || "5173";
  return isLocalAdmin ? `http://${publicHost}:${localPublicMenuPort}` : `https://${publicHost}`;
}
