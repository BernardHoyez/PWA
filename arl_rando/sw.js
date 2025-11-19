const CACHE_NAME = 'arl-rando-v1';
const urlsToCache = [
    '/PWA/arl_rando/',
    '/PWA/arl_rando/index.html',
    '/PWA/arl_rando/assets/css/style.css',
    '/PWA/arl_rando/assets/js/app.js',
    '/PWA/arl_rando/assets/js/map.js',
    '/PWA/arl_rando/assets/js/gpxkml.js',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js'
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
