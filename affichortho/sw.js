const CACHE_NAME = 'affichortho-v1';
const urlsToCache = [
    '/PWA/affichortho/',
    '/PWA/affichortho/index.html',
    '/PWA/affichortho/manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet.wmts@0.7.1/dist/leaflet.wmts.js'
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