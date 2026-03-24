/* ════════════════════════════════════════════════════
   shp2gpck — Service Worker
   Cache-first pour les assets statiques,
   network-only pour les CDN (sql.js wasm, jszip).
════════════════════════════════════════════════════ */

const CACHE_NAME   = 'shp2gpck-v4';
const CACHE_ASSETS = [
  '/PWA/shp2gpck/',
  '/PWA/shp2gpck/index.html',
  '/PWA/shp2gpck/manifest.json',
  '/PWA/shp2gpck/icon192.png',
  '/PWA/shp2gpck/icon512.png',
];

/* ─ Installation ─ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ─ Activation (purge ancien cache) ─ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ─ Fetch ─ */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // CDN (sql.js, jszip, fonts Google) → network-first, mise en cache
  const isCdn = url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if(isCdn) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if(cached) return cached;
        return fetch(event.request).then(response => {
          if(response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Assets locaux → cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if(response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
