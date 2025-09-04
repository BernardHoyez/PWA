const CACHE_NAME = 'allez-y-cache-v5'; // Version incrémentée pour forcer la mise à jour
// On ne met en cache que les fichiers locaux de l'application à l'installation.
const APP_SHELL_URLS = [
    './',
    './index.html',
    './index.css',
    './index.js', // Changé de index.tsx à index.js
    './metadata.json',
];

// Événement d'installation : mise en cache de l' "app shell".
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(APP_SHELL_URLS);
            })
    );
});

// Événement fetch : stratégie "Réseau d'abord, puis cache".
self.addEventListener('fetch', event => {
    // On ne gère que les requêtes GET
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            // 1. Essayer d'aller sur le réseau d'abord
            return fetch(event.request)
                .then(networkResponse => {
                    // Si la réponse est valide, on la met en cache pour une utilisation future
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    // Et on la retourne au navigateur
                    return networkResponse;
                })
                .catch(() => {
                    // 2. Si le réseau échoue (mode hors ligne), on cherche dans le cache
                    return cache.match(event.request);
                });
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
                        // Supprimer les caches qui ne sont plus sur la liste blanche
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});