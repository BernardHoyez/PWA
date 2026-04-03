/* ============================================================
   LittoExtract — Service Worker v4
   Cache app shell uniquement.
   Les tuiles sont servies via maplibregl.addProtocol() dans app.js
   ============================================================ */

const CACHE = 'littoextract-v4';
const SHELL = [
  '/PWA/littoextract/',
  '/PWA/littoextract/index.html',
  '/PWA/littoextract/app.js',
  '/PWA/littoextract/style.css',
  '/PWA/littoextract/coastline.geojson',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(SHELL.map(url => c.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Ne mettre en cache que les ressources locales de l'app
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith('/PWA/littoextract/')) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp?.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('/PWA/littoextract/index.html'));
    })
  );
});
