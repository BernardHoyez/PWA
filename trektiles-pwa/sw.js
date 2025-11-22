const CACHE_NAME = 'trektiles-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

// Installation : mise en cache des assets
self.addEventListener('install', event => {
    console.log('🔧 Installation du Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
    console.log('✅ Activation du Service Worker...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch : gestion des requêtes
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // 1. Ne pas intercepter les requêtes externes non-tuiles
    if (!request.url.startsWith(self.location.origin) && 
        !url.hostname.includes('tile.openstreetmap.org') &&
        !url.hostname.includes('data.geopf.fr')) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    // En cache : servir immédiatement
                    console.log('📦 Servi depuis cache:', request.url);
                    return response;
                }

                // Pas en cache : réseau avec mise en cache
                return fetch(request)
                    .then(response => {
                        // Ne mettre en cache que les réponses valides
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            // Ne pas mettre en cache les fichiers PMTiles générés
                            if (!request.url.includes('.pmtiles')) {
                                cache.put(request, responseToCache);
                            }
                        });

                        return response;
                    })
                    .catch(error => {
                        // Hors ligne : servir une page par défaut si disponible
                        if (request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        throw error;
                    });
            })
    );
});

// Message : communication avec la page
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});