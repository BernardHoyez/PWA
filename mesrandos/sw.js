// 1. Change le numéro de version à chaque modification majeure de ton index.html
// Cela va déclencher le nettoyage automatique chez l'utilisateur.
const CACHE_NAME = 'mesrandos-v3'; 

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json'
];

// 2. INSTALLATION : Mise en cache des fichiers de base
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Mise en cache des ressources');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                // Force le nouveau service worker à s'activer sans attendre
                return self.skipWaiting();
            })
    );
});

// 3. ACTIVATION : Nettoyage automatique et immédiat des anciens caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Suppression de l\'ancien cache :', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // Permet au Service Worker de prendre le contrôle des pages immédiatement
            return self.clients.claim();
        })
    );
});

// 4. STRATÉGIE DE FETCH : Réseau d'abord, Cache en secours
// Cette stratégie évite que ton index.html reste bloqué par le cache en local
self.addEventListener('fetch', (event) => {
    // On ne gère que les requêtes GET (évite de bloquer les API ou autres méthodes)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Si la réponse est valide, on met à jour le cache dynamiquement
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // En cas de panne réseau (hors-ligne), on pioche dans le cache
                return caches.match(event.request);
            })
    );
});