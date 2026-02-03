const CACHE_NAME = 'toutesmestraces-v1';
const urlsToCache = [
  '/PWA/toutesmestraces/',
  '/PWA/toutesmestraces/index.html',
  '/PWA/toutesmestraces/manifest.json',
  '/PWA/toutesmestraces/icon192.png',
  '/PWA/toutesmestraces/icon512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:wght@400;600&display=swap'
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
});

// Activation et nettoyage des anciens caches
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
});

// Stratégie de cache : Network First, fallback to Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la requête réussit, mettre en cache et retourner
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si la requête échoue, chercher dans le cache
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          // Pour les tuiles de carte IGN, retourner une réponse par défaut
          if (event.request.url.includes('ign.fr')) {
            return new Response('', { status: 200 });
          }
        });
      })
  );
});
