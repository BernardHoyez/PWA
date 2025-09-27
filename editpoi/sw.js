const CACHE_NAME = 'editpoi-v1.0.0';
const STATIC_RESOURCES = [
  '/PWA/editpoi/',
  '/PWA/editpoi/index.html',
  '/PWA/editpoi/manifest.json',
  '/PWA/editpoi/icons/icon192.png',
  '/PWA/editpoi/icons/icon512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des ressources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker: Installation terminée');
        self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Erreur installation', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Suppression ancien cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation terminée');
        return self.clients.claim();
      })
  );
});

// Gestion des requêtes réseau
self.addEventListener('fetch', (event) => {
  // Stratégie Cache First pour les ressources statiques
  if (STATIC_RESOURCES.some(resource => event.request.url.includes(resource.split('/').pop()))) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log('Service Worker: Servir depuis le cache', event.request.url);
            return response;
          }
          
          console.log('Service Worker: Récupérer depuis le réseau', event.request.url);
          return fetch(event.request)
            .then((response) => {
              // Vérifier si la réponse est valide
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Cloner la réponse pour la mettre en cache
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(() => {
              // En cas d'erreur réseau, retourner une page d'erreur basique
              if (event.request.destination === 'document') {
                return new Response(
                  '<!DOCTYPE html><html><head><title>Hors ligne</title></head><body><h1>Application hors ligne</h1><p>Veuillez vérifier votre connexion internet.</p></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              }
            });
        })
    );
  } 
  // Stratégie Network First pour les autres ressources
  else {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la ressource est récupérée avec succès, la mettre en cache
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // En cas d'échec, essayer de servir depuis le cache
          return caches.match(event.request);
        })
    );
  }
});

// Gestion de la synchronisation en arrière-plan (pour futures fonctionnalités)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Synchronisation en arrière-plan', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Ici on pourrait implémenter la sync des données
      Promise.resolve()
    );
  }
});

// Gestion des messages depuis l'application principale
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message reçu', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    caches.open(CACHE_NAME)
      .then((cache) => cache.keys())
      .then((requests) => {
        event.ports[0].postMessage({
          type: 'CACHE_INFO',
          cached: requests.length,
          cacheName: CACHE_NAME
        });
      });
  }
});

// Gestion de l'installation de la PWA
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('Service Worker: Prompt d\'installation disponible');
});

self.addEventListener('appinstalled', (event) => {
  console.log('Service Worker: PWA installée avec succès');
});