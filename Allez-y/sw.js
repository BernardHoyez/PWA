const CACHE_NAME = 'allez-y-cache-v1';
// Mise à jour avec les chemins relatifs pour GitHub Pages
const urlsToCache = [
    '.',
    './index.html',
    './index.css',
    './index.tsx',
    './metadata.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
];

self.addEventListener('install', event => {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Utiliser no-cors pour les requêtes externes lors de la mise en cache initiale
                const cachePromises = urlsToCache.map(url => {
                    const request = new Request(url, { mode: 'no-cors' });
                    return fetch(request).then(response => cache.put(url, response));
                });
                return Promise.all(cachePromises);
            })
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Si la requête est pour une origine différente (ex: tuiles de la carte),
    // on la laisse passer directement sur le réseau sans la mettre en cache ici.
    if (requestUrl.origin !== self.location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Pour les ressources de l'application, on utilise la stratégie "cache first".
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Non trouvé dans le cache, on va sur le réseau
                return fetch(event.request);
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
