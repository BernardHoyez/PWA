/* ═══════════════════════════════════════════════════════════
   Circuit IGN — Service Worker   sw.js
   Stratégie : Cache First pour les assets statiques
               Network First pour les tuiles IGN
   ═══════════════════════════════════════════════════════════ */

const APP_VERSION    = 'v1.0.0';
const STATIC_CACHE   = `circuit-ign-static-${APP_VERSION}`;
const TILES_CACHE    = 'circuit-ign-tiles';
const BASE_PATH      = '/PWA/circuit_extract';

// Assets statiques à précacher
const STATIC_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/app.js`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon-192.png`,
  `${BASE_PATH}/icons/icon-512.png`,
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://fonts.googleapis.com/css2?family=Bitter:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap',
];

// ─── Install ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn('SW: failed to cache', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== TILES_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Tuiles IGN — Network First avec cache de secours
  if (url.hostname === 'data.geopf.fr') {
    event.respondWith(networkFirstTile(event.request));
    return;
  }

  // Assets statiques — Cache First
  if (
    url.pathname.startsWith(BASE_PATH) ||
    url.hostname === 'unpkg.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Ressource non disponible hors ligne.', { status: 503 });
  }
}

async function networkFirstTile(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(TILES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Tuile de remplacement vide transparente 1×1
    return new Response(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
      { headers: { 'Content-Type': 'image/png' } }
    );
  }
}
