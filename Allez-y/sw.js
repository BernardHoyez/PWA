const CACHE_NAME = 'allez-y-cache-v7'; // Version incrémentée
const APP_SHELL_URLS = [
    './',
    './index.html',
    './index.css',
    './index.js',
    './metadata.json'
];

// Événement d'installation : mise en cache des fichiers de base de l'application.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(APP_SHELL_URLS);
            })
            .catch(error => {
                console.error('Failed to cache app shell:', error);
            })
    );
});

// Événement d'activation : nettoyage des anciens caches.
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});


// Événement fetch : Stratégie "Réseau d'abord, puis cache".
// Idéal pour les ressources qui doivent être à jour (comme la carte).
self.addEventListener('fetch', event => {
    event.respondWith(
        // 1. Essayer d'abord d'aller sur le réseau
        fetch(event.request)
            .then(networkResponse => {
                // Si la requête réussit, on met une copie dans le cache et on retourne la réponse
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request.clone(), networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // 2. Si le réseau échoue (hors ligne), on cherche dans le cache
                return caches.match(event.request);
            })
    );
});
