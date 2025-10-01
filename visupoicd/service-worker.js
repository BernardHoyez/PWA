<!-- ========================================
     service-worker.js
     ======================================== -->
const CACHE_NAME = 'visupoicd-v1';
const RUNTIME_CACHE = 'visupoicd-runtime-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/app.css',
  '/css/lightbox.css',
  '/js/utils.js',
  '/js/zip-handler.js',
  '/js/map.js',
  '/js/lightbox.js',
  '/js/app.js',
  '/manifest.json'
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas mettre en cache les requêtes externes (CDN, tiles, etc.)
  if (url.origin !== location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // Stratégie : Cache First pour les assets statiques
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
    );
    return;
  }

  // Stratégie : Network First pour le reste
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cloner la réponse car elle ne peut être utilisée qu'une fois
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE)
          .then(cache => cache.put(request, responseClone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

