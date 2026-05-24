const CACHE_NAME = 'agendafestiv-cache-v' + Date.now();
const ASSETS_TO_CACHE = [
    '/PWA/agendafestiv/',
    '/PWA/agendafestiv/index.html',
    '/PWA/agendafestiv/css/style.css',
    '/PWA/agendafestiv/js/app.js',
    '/PWA/agendafestiv/manifest.json',
    '/PWA/agendafestiv/icons/icon192.png',
    '/PWA/agendafestiv/icons/icon512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
            .catch((error) => console.error('Cache error:', error))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.origin.includes('la-provence-verte.net')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                    return response;
                })
                .catch(() => new Response(null, { status: 503 }))
        );
        return;
    }

    const isStaticAsset = ASSETS_TO_CACHE.some(asset =>
        url.pathname.includes(asset.split('/').pop())
    );

    if (isStaticAsset) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => response || fetch(event.request))
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request)
                    .then((response) => response || new Response(null, { status: 503 }))
            )
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.action === 'clearCache') {
        caches.keys().then((cacheNames) => cacheNames.forEach((name) => caches.delete(name)));
        event.source.postMessage({ action: 'reload' });
    }
});