const CACHE_NAME = 'tracehtml-v1';
const urlsToCache = [
  '/',
  '/PWA/tracehtml/',
  '/PWA/tracehtml/index.html',
  '/PWA/tracehtml/app.js',
  '/PWA/tracehtml/manifest.json',
  '/PWA/tracehtml/icon192.png',
  '/PWA/tracehtml/icon512.png'
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