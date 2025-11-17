const CACHE_NAME = 'matrace-v1';
const urlsToCache = [
  '/PWA/matrace/',
  '/PWA/matrace/index.html',
  '/PWA/matrace/style.css',
  '/PWA/matrace/app.js',
  'https://cdn.jsdelivr.net/npm/ol/ol.css',
  'https://cdn.jsdelivr.net/npm/ol/ol.js'
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
