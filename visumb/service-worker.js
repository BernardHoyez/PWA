const CACHE_NAME = 'visumb-cache-v1';
const urlsToCache = [
    '/PWA/visumb/',
    '/PWA/visumb/index.html',
    '/PWA/visumb/icon.png',
    '/PWA/visumb/icon-512.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.min.js',
    'https://cdn.jsdelivr.net/npm/leaflet.tilelayer.mbtiles@1.0.0/dist/leaflet.tilelayer.mbtiles.js'
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