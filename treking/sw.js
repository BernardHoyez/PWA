const CACHE_NAME = 'treking-v1.0.0';
const urlsToCache = [
    '/PWA/treking/',
    '/PWA/treking/index.html',
    '/PWA/treking/manifest.json',
    '/PWA/treking/icon192.png',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
    'https://unpkg.com/pmtiles@3.0.3/dist/pmtiles.min.js'
];

self.addEventListener('install', event => {
    console.log('🔧 Installation Treking SW...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('✅ Activation Treking SW...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    
    // Ne pas intercepter les fichiers PMTiles locaux
    if (request.url.includes('.pmtiles') || request.url.includes('blob:')) {
        return fetch(request);
    }

    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) return response;
                
                return fetch(request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    
                    return response;
                }).catch(() => {
                    // Hors ligne : servir la page d'accueil pour tout document
                    if (request.destination === 'document') {
                        return caches.match('/PWA/treking/index.html');
                    }
                });
            })
    );
});