const CACHE_NAME = 'creer-parcours-v1';
const urlsToCache = [
  '/Creer_Parcours/',
  '/Creer_Parcours/index.html',
  '/Creer_Parcours/icons/icon-192x192.png',
  '/Creer_Parcours/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/exif-js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
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
