const CACHE_NAME = 'editchat-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon192.png',
  './icons/icon512.png',
  './icons/favicon.ico',
  'https://unpkg.com/leaflet/dist/leaflet.css',
  'https://unpkg.com/leaflet/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/exifreader@5.0.3/dist/exif-reader.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
];

// Installation : pré-cache de toutes les ressources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
});

// Interception des requêtes pour un fonctionnement hors ligne complet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request).catch(() => caches.match('./index.html'))
    )
  );
});
