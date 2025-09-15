const CACHE_NAME = 'suivons-le-guide-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installation');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Mise en cache des ressources');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activation');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Suppression ancien cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Retourner la réponse mise en cache si disponible
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Sinon, faire la requête réseau
                return fetch(event.request).then((response) => {
                    // Vérifier si la réponse est valide
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Cloner la réponse car elle ne peut être utilisée qu'une fois
                    const responseToCache = response.clone();
                    
                    // Mettre en cache la nouvelle réponse
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // En cas d'erreur réseau, retourner une page offline si nécessaire
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            })
    );
});