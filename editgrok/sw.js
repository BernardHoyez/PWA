const CACHE_NAME = 'editgrok-v1';
const urlsToCache = [
  '/PWA/editgrok/',
  '/PWA/editgrok/index.html',
  '/PWA/editgrok/styles.css',
  '/PWA/editgrok/app.js',
  '/PWA/editgrok/manifest.json',
  '/PWA/editgrok/icons/icon192.png',
  '/PWA/editgrok/icons/icon512.png',
  '/PWA/editgrok/icons/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/exif-js/2.3.0/exif.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Service Worker: Cache error', err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(err => console.error('Service Worker: Fetch error', err))
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activation');
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