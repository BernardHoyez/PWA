const CACHE_NAME = 'visite-editeur-cache-v7';
const urlsToCache = [
    '/',
    'manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://esm.sh/react@18.2.0',
    'https://esm.sh/react-dom@18.2.0/client',
    'https://esm.sh/leaflet@1.9.4',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/exif-js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Opened cache');
            const promises = urlsToCache.map(url => {
                const request = new Request(url, { mode: 'cors' });
                return fetch(request).then(response => {
                    if (response.ok) {
                        return cache.put(url, response);
                    }
                    console.warn('Caching failed for (non-ok response):', url);
                }).catch(error => {
                    console.error('Caching failed for:', url, error);
                });
            });
            return Promise.all(promises);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            if (response) {
                return response;
            }

            return fetch(event.request).then(
                response => {
                    if (!response || response.status !== 200 || response.type === 'opaque') {
                        return response;
                    }

                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            if (event.request.method === 'GET') {
                                cache.put(event.request, responseToCache);
                            }
                        });

                    return response;
                }
            ).catch(() => {
                console.log('Fetch failed; returning offline page instead.', event.request.url);
            });
        })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
