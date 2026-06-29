// Service Worker GrocyShare — gestion des notifications push.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "GrocyShare", body: event.data.text() };
  }

  const title = payload.title ?? "GrocyShare";
  const options = {
    body: payload.body ?? "",
    tag: payload.tag ?? "grocyshare",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    data: { url: payload.url ?? "/" },
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url ?? "/";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windowClients) => {
      // Onglet déjà ouvert : on l'amène sur le bon groupe puis on le focus.
      for (const client of windowClients) {
        if ("focus" in client) {
          if ("navigate" in client && client.url !== target) {
            try { await client.navigate(target); } catch {}
          }
          return client.focus();
        }
      }
      // Sinon on ouvre une nouvelle fenêtre sur le groupe.
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    }),
  );
});
