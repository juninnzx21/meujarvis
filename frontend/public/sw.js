const CACHE_NAME = "jarvis-static-v1";
const STATIC_ASSETS = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg", "/icons/maskable-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isSensitiveRequest(request) {
  const url = new URL(request.url);
  return request.method !== "GET" ||
    url.pathname.startsWith("/api") ||
    request.headers.has("authorization") ||
    request.headers.has("cookie");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isSensitiveRequest(request) || url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match("/offline.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const cacheable = response.ok && ["script", "style", "image", "font"].includes(request.destination);
        if (cacheable) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
