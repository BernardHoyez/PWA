const CACHE_NAME = 'visugrok-v1';
const urlsToCache = [
  './visugrok/',
  './visugrok/index.html',
  './visugrok/styles.css',
  './visugrok/app.js',
  './visugrok/manifest.json',
  './visugrok/icons/icon192.png',
  './visugrok/icons/icon512.png',
  './visugrok/icons/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Service Worker: Cache error', err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Suppression du cache obsolète', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});