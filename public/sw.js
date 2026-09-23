const ASSET_CACHE = "bikelog-assets-v1";
const SHELL_CACHE = "bikelog-shell-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== ASSET_CACHE && k !== SHELL_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed, immutable build output: cache-first, populate on first fetch.
  if (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "font"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(event.request, copy));
          return res;
        });
      })
    );
    return;
  }

  // Navigations: network-first so SSR stays fresh; offline falls back to the
  // last-cached shell (the in-memory store still shows the last known data).
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Everything else (API, media): network only. Data never goes through the SW cache.
});