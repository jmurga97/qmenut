// Push only: no fetch handler, no cache, no importScripts. Registered through the
// qmenut-service-worker Trusted Types policy (see features/notifications/services.ts).

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "QMenut", {
        body: data.body,
        tag: data.tag,
        data: { url: data.url || "/notifications" },
        icon: "/icons/icon-192.png",
      }),
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => clients.forEach((client) => client.postMessage({ type: "notification" }))),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((candidate) => new URL(candidate.url).origin === self.location.origin);
      if (!client) return self.clients.openWindow(url);
      return client.focus().then(() => client.navigate(url));
    }),
  );
});
