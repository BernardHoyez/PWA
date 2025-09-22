// Nom du cache
const CACHE_NAME = "visite-pwa-v1";

// Fichiers à mettre en cache (statiques)
const STATIC_ASSETS = [
  "/PWA/Visite/",
  "/PWA/Visite/index.html",
  "/PWA/Visite/style.css",
  "/PWA/Visite/app.js",
  "/PWA/Visite/manifest.json",
  "/PWA/Visite/lib/leaflet.js",
  "/PWA/Visite/lib/leaflet.css",
  "/PWA/Visite/lib/jszip.min.js",
  "/PWA/Visite/icons/icon-192x192.png",
  "/PWA/Visite/icons/icon-512x512.png",
];

// Installation du Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error("Erreur lors de la mise en cache :", err);
      })
  );
});

// Activation du Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== "GET") return;

  // Stratégie "Cache First" pour les fichiers statiques
  if (STATIC_ASSETS.some((url) => event.request.url.includes(url))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
  // Stratégie "Network First" pour les données dynamiques (ex: ZIP)
  else {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});
