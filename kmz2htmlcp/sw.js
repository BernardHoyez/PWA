const CACHE_NAME = "kmz2htmlcp-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./sw.js",
  "./manifest.webmanifest",
  "./icon192.png",
  "./icon512.png",
  // Leaflet depuis CDN
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

// Installation : pré-cache des ressources de base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Stratégie cache-first avec fallback réseau
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // On ne gère que les requêtes GET
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          // Mise en cache des réponses de type basique
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback possible ici (page offline, etc.)
          return cachedResponse || new Response("Offline", { status: 503 });
        });
    })
  );
});
