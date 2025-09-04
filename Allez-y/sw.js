const CACHE_NAME = 'allez-y-cache-v6'; // Version incrémentée
const APP_SHELL_URLS = [
    './',
    './index.html',
    './index.css',
    './index.js',
    './metadata.json'
];

// Événement d'installation : mise en cache des fichiers locaux de l'application.
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
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});


// Événement fetch : stratégie "Cache d'abord, puis réseau" UNIQUEMENT pour les ressources locales.
self.addEventListener('fetch', event => {
    // On ne traite que les requêtes de notre propre origine.
    // Toutes les autres requêtes (vers unpkg.com, openstreetmap.org, etc.)
    // seront gérées normalement par le navigateur, sans interférence.
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request).then(response => {
                // Si la ressource est dans le cache, on la sert.
                // Sinon, on la récupère sur le réseau.
                return response || fetch(event.request);
            })
        );
    }
});
