const CACHE_NAME = 'mestiles-v1';
const urlsToCache = [
  '/PWA/mestiles/',
  '/PWA/mestiles/index.html',
  '/PWA/mestiles/manifest.json',
  '/PWA/mestiles/icon192.png',
  '/PWA/mestiles/icon512.png'
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