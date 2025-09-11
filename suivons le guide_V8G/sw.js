const CACHE_NAME = 'guide-v5-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
