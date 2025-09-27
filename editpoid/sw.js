const CACHE_NAME = 'editpoid-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon192.png',
  '/icons/icon512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js',
  'https://unpkg.com/exif-js@2.3.0/exif.js',
  'https://unpkg.com/sortablejs@1.15.0/Sortable.min.js'
];

// Installation du service worker
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[Service Worker] Mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('[Service Worker] Erreur lors de la mise en cache:', error);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activation');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Retourner la réponse en cache si disponible
        if (response) {
          return response;
        }
        
        // Sinon, faire une requête réseau
        return fetch(event.request).then(function(response) {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Cloner la réponse pour la mettre en cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(function() {
          // En cas d'erreur réseau, retourner une page d'erreur simple
          if (event.request.destination === 'document') {
            return new Response(
              '<!DOCTYPE html><html><head><title>Hors ligne</title></head><body><h1>Application hors ligne</h1><p>Veuillez vérifier votre connexion internet.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
        });
      })
  );
});

// Gestion des messages du client
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});