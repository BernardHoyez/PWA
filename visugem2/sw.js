const CACHE_NAME = 'visugem-cache-v2'; // Incrémentation de la version du cache pour forcer la mise à jour
const BASE_PATH = '/PWA/visugem/';
const urlsToCache = [
  // Fichiers de l'application
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}index.tsx`,
  `${BASE_PATH}manifest.json`,

  // Bibliothèques externes
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// À l'installation, on met en cache tous les fichiers nécessaires
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert, mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('La mise en cache des ressources a échoué pendant l\'installation :', err);
      })
  );
});

// À l'activation, on supprime les anciens caches pour éviter les conflits
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression de l'ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// À chaque requête (fetch), on applique une stratégie "cache-first"
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si la ressource est dans le cache, on la retourne
        if (response) {
          return response;
        }
        // Sinon, on va la chercher sur le réseau
        return fetch(event.request);
      }
    )
  );
});
