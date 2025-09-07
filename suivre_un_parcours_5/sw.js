const CACHE_NAME = 'suivre-parcours-v1';
const urlsToCache = [
  '/Suivre_Parcours/',
  '/Suivre_Parcours/index.html',
  '/Suivre_Parcours/icons/icon-192x192.png',
  '/Suivre_Parcours/icons/icon-512x512.png',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
