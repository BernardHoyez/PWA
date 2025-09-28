const CACHE_NAME = 'editpoih-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/service-worker.js',
  '/css/leaflet.css',
  '/js/leaflet.js',
  '/js/jszip.min.js',
  '/js/exif.js',
  '/js/sortable.min.js',
  '/js/main.js',
  '/icons/icon192.png',
  '/icons/icon512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});