const CACHE_NAME = 'tracevisu-v1';
const urlsToCache = [
  '/PWA/tracevisu/',
  '/PWA/tracevisu/index.html',
  '/PWA/tracevisu/manifest.json',
  '/PWA/tracevisu/icon192.png',
  '/PWA/tracevisu/icon512.png'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stratégie de récupération : Network First, fallback sur Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cloner la réponse car elle ne peut être utilisée qu'une fois
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, chercher dans le cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Page par défaut si rien n'est trouvé
            if (event.request.destination === 'document') {
              return caches.match('/PWA/tracevisu/index.html');
            }
          });
      })
  );
});