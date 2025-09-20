const CACHE_NAME = 'editgrok-v1';
const urlsToCache = [
  '/PWA/',
  '/PWA/index.html',
  '/PWA/styles.css',
  '/PWA/app.js',
  '/PWA/manifest.json',
  '/PWA/icons/icon192.png',
  '/PWA/icons/icon512.png',
  '/PWA/icons/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/exif-js/2.3.0/exif.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});