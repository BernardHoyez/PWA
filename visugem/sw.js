// Version 4 - Robuste et définitive
const CACHE_NAME = 'visugem-cache-v4'; 
const urlsToCache = [
  // Fichiers de base de l'application. On retire les chemins qui peuvent ne pas exister.
  './',
  './index.html',
  './manifest.json',

  // Bibliothèques externes depuis le CDN (essentiel pour le mode hors ligne)
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1/client'
];

// À l'installation, on met en cache les fichiers essentiels
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert, mise en cache des ressources de l\'application.');
        // addAll échoue si une seule ressource n'est pas trouvée.
        // On s'assure que toutes les URLs sont valides.
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Échec de la mise en cache pendant l\'installation :', err);
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
            console.log('Suppression de l\'ancien cache :', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Stratégie "Cache d'abord, puis réseau"
self.addEventListener('fetch', (event) => {
  // On ne met pas en cache les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Si c'est dans le cache, on le retourne
          return response;
        }
        // Sinon, on va le chercher sur le réseau
        return fetch(event.request).then((networkResponse) => {
            // On peut optionnellement mettre en cache les nouvelles requêtes ici
            // mais pour la stabilité, on s'en tient au cache initial.
            return networkResponse;
        });
      })
      .catch(err => {
        console.error('Erreur lors du fetch :', err);
        // Gérer l'erreur, par exemple en renvoyant une page de fallback
      })
  );
});
