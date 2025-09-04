const CACHE_NAME = 'virtual-tour-cache-v1';
// Liste des fichiers essentiels de l'application à mettre en cache.
const urlsToCache = [
  '/',
  'index.html',
  'index.css',
  'index.js' // Fichier JavaScript principal de l'application
];

// Installe le service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Gère les requêtes en servant depuis le cache d'abord
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retourne la réponse
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Met à jour le service worker et supprime les anciens caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});