const CACHE_NAME = 'allez-y-cache-v8';
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
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Événement fetch : gestion des requêtes.
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Si la requête est pour une ressource externe (origine différente),
    // on laisse le navigateur la gérer. On n'interfère pas.
    // C'est la correction cruciale pour Leaflet et les tuiles OSM.
    if (requestUrl.origin !== self.location.origin) {
        return; // Ne pas intercepter la requête.
    }

    // Pour les ressources locales, on utilise la stratégie "Cache d'abord".
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Si la ressource est dans le cache, on la sert.
            if (cachedResponse) {
                return cachedResponse;
            }
            // Sinon, on la récupère sur le réseau.
            return fetch(event.request);
        })
    );
});
