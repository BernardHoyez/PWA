const CACHE_NAME = 'pc2phone-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './app.js',
  './styles.css',
  './icon192.png',
  './icon512.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Stratégie Cache First, fallback Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - retourner la réponse
        if (response) {
          return response;
        }
        // Sinon, faire la requête réseau
        return fetch(event.request);
      }
    )
  );
});