/* cenoutil — Service Worker v3
   Déploiement : BernardHoyez.github.io/PWA/cenoutil
   Cache offline-first pour fonctionnement terrain sans réseau
*/

const CACHE_NAME = 'cenoutil-v3';
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
  `${BASE}/data/observations.json`,
  `${BASE}/data/fossiles.json`,
  `${BASE}/data/pages.json`,
  `${BASE}/icons/icon192.png`,
  `${BASE}/icons/icon512.png`,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        if (event.request.url.includes('/photos/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'image') return new Response('', { status: 200 });
      });
    })
  );
});
