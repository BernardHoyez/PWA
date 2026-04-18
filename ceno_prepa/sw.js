/* cenoprepa — Service Worker
   Déploiement : BernardHoyez.github.io/PWA/ceno_prepa
   Cache offline de l'interface expert
*/

const CACHE = 'ceno_prepa-v1';
const BASE  = '/PWA/ceno_prepa';

const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/css/style.css`,
  `${BASE}/js/app.js`,
  `${BASE}/js/editeur-observations.js`,
  `${BASE}/js/editeur-fossiles.js`,
  `${BASE}/js/editeur-pages.js`,
  `${BASE}/js/editeur-descentes.js`,
  `${BASE}/js/export.js`,
  `${BASE}/js/gps.js`,
  `${BASE}/icons/icon192.png`,
  `${BASE}/icons/icon512.png`,
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
