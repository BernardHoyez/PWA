// Service Worker pour Carte Interactive POI
// Version et nom du cache
const CACHE_NAME = 'poi-map-cache-v1';
const OFFLINE_CACHE_NAME = 'poi-map-offline-v1';

// Base path pour GitHub Pages sous-dossier
const BASE_PATH = '/PWA/carte-interactive-poi/';

// Fichiers à mettre en cache pour le fonctionnement hors-ligne
const CACHE_URLS = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'css/style.css',
    BASE_PATH + 'js/main.js',
    BASE_PATH + 'js/pwa-handler.js',
    BASE_PATH + 'manifest.json',
    BASE_PATH + 'README.md',
    BASE_PATH + 'GUIDE-UTILISATION.md',
    BASE_PATH + 'exemple-visit.json',
    // Ressources externes essentielles
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Installation du Service Worker
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Installation en cours...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cache ouvert, ajout des fichiers...');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => {
                console.log('✅ Service Worker: Installation réussie');
                // Force l'activation immédiate
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Erreur lors de l\'installation:', error);
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Activation en cours...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Supprimer les anciens caches
                        if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE_NAME) {
                            console.log('🗑️ Suppression de l\'ancien cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker: Activation réussie');
                // Prendre le contrôle de toutes les pages
                return self.clients.claim();
            })
    );
});

// Interception des requêtes réseau
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Ignorer les requêtes non-HTTP
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Stratégie Cache First pour les ressources statiques
    if (shouldCacheFirst(request)) {
        event.respondWith(cacheFirstStrategy(request));
    }
    // Stratégie Network First pour les tuiles de carte OSM
    else if (isMapTile(request)) {
        event.respondWith(networkFirstStrategy(request));
    }
    // Stratégie Network First pour les autres ressources
    else {
        event.respondWith(networkFirstStrategy(request));
    }
});

// Détermine si une requête doit utiliser la stratégie Cache First
function shouldCacheFirst(request) {
    const url = request.url;
    return (
        // Fichiers de l'application
        url.includes(self.location.origin) ||
        // Bibliothèques CDN
        url.includes('unpkg.com') ||
        url.includes('jsdelivr.net') ||
        url.includes('googleapis.com') ||
        url.includes('fontawesome') ||
        // Types de fichiers statiques
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font'
    );
}

// Détermine si c'est une tuile de carte
function isMapTile(request) {
    const url = request.url;
    return (
        url.includes('tile.openstreetmap.org') ||
        url.includes('tiles') ||
        request.destination === 'image'
    );
}

// Stratégie Cache First - priorité au cache
async function cacheFirstStrategy(request) {
    try {
        // Chercher d'abord dans le cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Si pas en cache, fetch depuis le réseau
        const networkResponse = await fetch(request);
        
        // Mettre en cache si succès
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('Erreur Cache First:', error);
        
        // Fallback vers une page hors-ligne si disponible
        if (request.destination === 'document') {
            const offlineResponse = await caches.match(BASE_PATH + 'index.html');
            if (offlineResponse) return offlineResponse;
        }
        
        // Retourner une réponse d'erreur générique
        return new Response('Contenu non disponible hors-ligne', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Stratégie Network First - priorité au réseau
async function networkFirstStrategy(request) {
    try {
        // Essayer le réseau en premier
        const networkResponse = await fetch(request);
        
        // Mettre en cache si c'est une ressource utile
        if (networkResponse && networkResponse.status === 200 && shouldCache(request)) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Si le réseau échoue, chercher dans le cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        console.warn('Erreur Network First:', error);
        return new Response('Ressource non disponible', {
            status: 404,
            statusText: 'Not Found'
        });
    }
}

// Détermine si une ressource doit être mise en cache
function shouldCache(request) {
    const url = request.url;
    
    // Ne pas cacher les tuiles de carte (trop volumineuses)
    if (isMapTile(request)) return false;
    
    // Cacher les ressources utiles
    return (
        request.method === 'GET' &&
        (
            url.includes(self.location.origin) ||
            url.includes('unpkg.com') ||
            url.includes('jsdelivr.net') ||
            url.includes('googleapis.com')
        )
    );
}

// Gestion des messages de l'application
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('📨 Service Worker: Message reçu - SKIP_WAITING');
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_ZIP_DATA') {
        console.log('📦 Service Worker: Cache des données ZIP demandé');
        // Ici on pourrait cacher des données spécifiques de visite
        cacheZipData(event.data.payload);
    }
});

// Cache les données d'une visite ZIP pour accès hors-ligne
async function cacheZipData(visitData) {
    try {
        const cache = await caches.open(OFFLINE_CACHE_NAME);
        
        // Créer une réponse JSON avec les données de visite
        const response = new Response(JSON.stringify(visitData), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=86400' // 24h
            }
        });
        
        await cache.put(BASE_PATH + 'offline-visit-data.json', response);
        console.log('✅ Données de visite mises en cache pour mode hors-ligne');
    } catch (error) {
        console.error('❌ Erreur lors du cache des données ZIP:', error);
    }
}

// Notification de mise à jour disponible
self.addEventListener('updatefound', () => {
    console.log('🔄 Service Worker: Mise à jour trouvée');
    
    // Notifier l'application qu'une mise à jour est disponible
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'UPDATE_AVAILABLE',
                message: 'Une nouvelle version de l\'application est disponible'
            });
        });
    });
});

console.log('🎯 Service Worker POI Map chargé et prêt !');