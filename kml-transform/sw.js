const CACHE_NAME = 'kml-transform-v1.0';
const urlsToCache = [
  'https://bernardhoyez.github.io/PWA/kml-transform/',
  '/PWA/kml-transform/index.html',
  '/PWA/kml-transform/style.css',
  '/PWA/kml-transform/app.js',
  '/PWA/kml-transform/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
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
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});