const CACHE_NAME = 'kmzconvertisseur-v2';
const STATIC_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon192.png',
  'icon512.png'
];

// Installation : mise en cache des fichiers statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des assets statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie : Cache First pour les assets statiques, Network First pour le reste
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes cross-origin (ex: CDN JSZip, Nominatim)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si trouvé dans le cache → on le renvoie immédiatement
        if (cachedResponse) {
          return cachedResponse;
        }

        // Sinon → fetch réseau + mise en cache si succès
        return fetch(event.request).then(networkResponse => {
          // Ne pas mettre en cache les réponses non valides ou non-GET
          if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
            return networkResponse;
          }

          // Cloner la réponse pour pouvoir la consommer deux fois
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(() => {
          // En cas d'échec réseau → fallback sur cache si disponible
          return caches.match(event.request);
        });
      })
  );
});
