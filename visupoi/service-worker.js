const CACHE_NAME = 'visupoi-v1';
const PRECACHE = [
'./',
'./index.html',
'./css/app.css',
'./js/app.js',
'./js/map.js',
'./js/zip-handler.js',
'./js/utils.js',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];


self.addEventListener('install', (e) => {
e.waitUntil(
caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
);
self.skipWaiting();
});


self.addEventListener('activate', (e) => {
e.waitUntil(self.clients.claim());
});


self.addEventListener('fetch', (e) => {
e.respondWith(
caches.match(e.request).then(cached => cached || fetch(e.request))
);
});