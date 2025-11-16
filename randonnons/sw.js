const CACHE_NAME = 'randonnons-v1';
const urlsToCache = [
    '/',
    '/index.html',
    'https://cdn.jsdelivr.net/npm/ol@v7.3.0/dist/ol.js',
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('data.geopf.fr/wmts')) {
        event.respondWith(
            caches.match(event.request).then((response) => response || fetch(event.request).then((fetchResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, fetchResponse.clone());
                    return fetchResponse;
                });
            }))
        );
    } else {
        event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
    }
});