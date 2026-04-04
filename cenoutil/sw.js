/* cenoutil — Service Worker
   Déploiement : BernardHoyez.github.io/PWA/cenoutil
   Cache offline-first pour fonctionnement terrain sans réseau
*/

const CACHE_NAME = 'cenoutil-v1';
const BASE = '/PWA/cenoutil';

const STATIC_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/css/style.css`,
  `${BASE}/js/app.js`,
  `${BASE}/js/carte.js`,
  `${BASE}/js/fossiles.js`,
  `${BASE}/js/infos.js`,
  `${BASE}/js/mbtiles.js`,
  `${BASE}/data/markers.json`,
  `${BASE}/data/fossiles.json`,
  `${BASE}/data/pages.json`,
  `${BASE}/icons/icon192.png`,
  `${BASE}/icons/icon512.png`,
];

/* Installation : mise en cache des assets statiques */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

/* Activation : suppression des anciens caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch : offline-first — cache en priorité, réseau en fallback */
self.addEventListener('fetch', event => {
  /* Ignorer les requêtes non-GET et hors scope */
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      /* Tentative réseau pour ressources non cachées (photos à la demande) */
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        /* Mise en cache dynamique des photos */
        const url = event.request.url;
        if (url.includes('/photos/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        /* Ressource manquante hors ligne : réponse vide pour les images */
        if (event.request.destination === 'image') {
          return new Response('', { status: 200 });
        }
      });
    })
  );
});
