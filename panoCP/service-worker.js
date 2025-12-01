// service-worker.js
const CACHE_NAME = "panoCP-v1";
const APP_SHELL = [
  "/PWA/panoCP/",
  "/PWA/panoCP/index.html",
  "/PWA/panoCP/manifest.json",
  "/PWA/panoCP/css/styles.css",
  "/PWA/panoCP/js/panoCP.js",
  "/PWA/panoCP/js/worker.js",
  "/PWA/panoCP/vendor/opencv.js",
  "/PWA/panoCP/icon192.png",
  "/PWA/panoCP/icon512.png"
];

// Installation : mise en cache des fichiers de base
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch : répondre depuis le cache ou aller chercher en ligne
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((resp) => {
          // Mise en cache des nouvelles ressources (même origine uniquement)
          if (
            event.request.method === "GET" &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const respClone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, respClone);
            });
          }
          return resp;
        })
        .catch(() => {
          // Fallback : renvoyer index.html si offline
          return caches.match("/PWA/panoCP/index.html");
        });
    })
  );
});
