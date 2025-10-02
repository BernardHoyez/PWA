const CACHE_NAME = 'visupoicd-v2';
const RUNTIME_CACHE = 'visupoicd-runtime-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/app.css',
  './css/lightbox.css',
  './js/utils.js',
  './js/zip-handler.js',
  './js/map.js',
  './js/lightbox.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des ressources statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Erreur lors de l\'installation:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activation terminée');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas mettre en cache les requêtes externes (CDN, tiles, etc.)
  if (url.origin !== location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // Stratégie: Cache First pour les assets statiques
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.replace('./', '')))) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            console.log('[SW] Depuis cache:', request.url);
            return response;
          }
          console.log('[SW] Depuis réseau:', request.url);
          return fetch(request);
        })
    );
    return;
  }

  // Stratégie: Network First pour le reste
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cloner la réponse car elle ne peut être utilisée qu'une fois
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE)
          .then(cache => cache.put(request, responseClone));
        return response;
      })
      .catch(() => {
        // En cas d'échec réseau, essayer le cache
        return caches.match(request);
      })
  );
});