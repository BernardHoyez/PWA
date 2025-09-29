// visupoi2 : Service Worker avec chemins relatifs pour GitHub Pages
const cacheName = 'visupoi2-cache-v1';
const filesToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/utils.js',
  './js/zip-handler.js',
  './js/map.js',
  './js/app.js'
];

// Installation : mise en cache des fichiers de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(filesToCache);
    })
  );
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== cacheName)
            .map(k => caches.delete(k))
      )
    )
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
