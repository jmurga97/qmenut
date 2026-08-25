const LOCAL_ADMIN_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export function buildPublicMenuUrl(publicHost: string, adminHost = window.location.hostname) {
  const isLocalAdmin = LOCAL_ADMIN_HOSTS.has(adminHost) || adminHost.endsWith(".localhost");
  return isLocalAdmin ? `http://${publicHost}:5173` : `https://${publicHost}`;
}
