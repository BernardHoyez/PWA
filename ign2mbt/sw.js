/* ═══════════════════════════════════════════════════════
   IGN2MBT – Service Worker
   Cache statique des ressources de l'application.
   Les tuiles IGN ne sont PAS mises en cache (volumineuses).
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'ign2mbt-v1';

const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm',
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Certains assets non mis en cache :', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : purge des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : cache-first pour les assets statiques, network-only pour les tuiles
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Tuiles OSM et IGN : toujours réseau (ne pas mettre en cache)
  if (
    url.includes('tile.openstreetmap.org') ||
    url.includes('data.geopf.fr') ||
    url.includes('mt0.google.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets de l'appli : cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Ne mettre en cache que les réponses valides
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
