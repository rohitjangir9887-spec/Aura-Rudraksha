/**
 * Self-Unregistering Service Worker Cleanup
 * Ensures any previously installed Service Worker is immediately removed
 * so third-party scripts and beacons (Meta Pixel facebook.com/tr, Google Tag, PayU)
 * are never intercepted or cached.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        clients.forEach((client) => {
          if (client && "navigate" in client) {
            client.navigate(client.url).catch(() => {});
          }
        });
      })
  );
});


