// Définir la portée de la PWA pour le sous-dossier
const BASE_PATH = '/PWA/je_parle/';
const CACHE_NAME = 'je_parle-pwa-v1';
const urlsToCache = [
    BASE_PATH, // Cible l'index.html
    BASE_PATH + 'index.html',
    BASE_PATH + 'app.js',
    BASE_PATH + 'style.css',
    BASE_PATH + 'manifest.json',
    BASE_PATH + 'images/icon-192x192.png',
    BASE_PATH + 'images/icon-512x512.png'
];

// Installation : Mise en cache des ressources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache ouvert. Ajout des ressources.');
                // Note : L'échec d'une seule ressource peut empêcher l'installation.
                return cache.addAll(urlsToCache);
            })
    );
});

// Récupération : Servir les ressources à partir du cache
self.addEventListener('fetch', (event) => {
    // Ignorer les requêtes non-HTTP/HTTPS
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Retourner la ressource depuis le cache si elle existe
                if (response) {
                    return response;
                }
                // Sinon, la récupérer du réseau
                return fetch(event.request);
            })
    );
});

// Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});