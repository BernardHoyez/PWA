// sw.js - Service Worker pour tracef
const CACHE_NAME = 'tracef-v1';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon512.png',
  'https://unpkg.com/@turf/turf@6/turf.min.js',
  'https://unpkg.com/@mapbox/togeojson',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/tokml@0.4.0/tokml.js'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Erreur de cache:', err);
      })
  );
  self.skipWaiting();
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
  return self.clients.claim();
});

// Stratégie de cache: Network First, puis Cache
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers des APIs externes (Nominatim, IGN, OSM tiles)
  const url = new URL(event.request.url);
  if (url.hostname === 'nominatim.openstreetmap.org' ||
      url.hostname === 'data.geopf.fr' ||
      url.hostname.includes('tile.openstreetmap.org')) {
    return fetch(event.request);
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la réponse est valide, la mettre en cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, utiliser le cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Si pas en cache non plus, page offline basique
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});