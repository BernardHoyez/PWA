const CACHE_NAME = 'qr-generator-v1';
const BASE_PATH = '/PWA/QRcodeGenerateur/';

const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'style.css',
  BASE_PATH + 'app.js',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icon.svg',
  BASE_PATH + 'icon-192.png',
  BASE_PATH + 'icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Erreur de cache:', err);
      })
  );
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stratégie Cache First avec fallback réseau
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourne du cache si disponible
        if (response) {
          return response;
        }
        
        // Sinon, va chercher sur le réseau
        return fetch(event.request)
          .then(response => {
            // Vérifie que la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone la réponse pour la mettre en cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
      .catch(() => {
        // Si offline et pas en cache, retourne une page d'erreur basique
        if (event.request.destination === 'document') {
          return caches.match(BASE_PATH + 'index.html');
        }
      })
  );
});