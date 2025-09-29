const cacheName = 'visupoi2-cache-v1';
const filesToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/utils.js',
  '/js/zip-handler.js',
  '/js/map.js',
  '/js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(filesToCache))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
