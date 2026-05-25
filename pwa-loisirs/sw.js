/* ────────────────────────────────────────────
   Loisirs Proches — sw.js
   Stratégie : "Brise-caches"
   Network-first → fallback cache → offline page
   Version : incrémentée à chaque déploiement
   ──────────────────────────────────────────── */

const CACHE_VERSION = 'loisirs-v1';
const CACHE_STATIC  = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;

// Fichiers pré-cachés à l'installation
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './offline.html',
  './icons/icon192.png',
  './icons/icon512.png',
];

// ── INSTALL : pré-cache statique ──────────────
self.addEventListener('install', event => {
  console.log('[SW] install :', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // ← brise-caches : activation immédiate
  );
});

// ── ACTIVATE : purge des anciennes versions ───
self.addEventListener('activate', event => {
  console.log('[SW] activate :', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('loisirs-') && !key.startsWith(CACHE_VERSION))
          .map(key => {
            console.log('[SW] suppression cache obsolète :', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // ← brise-caches : prise de contrôle immédiate
  );
});

// ── FETCH : Network-first strategy ───────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions non-supportées
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Appels API OpenAgenda → Network only (pas de cache des données)
  if (url.hostname === 'api.openagenda.com') {
    event.respondWith(networkOnly(request));
    return;
  }

  // Nominatim (reverse geocoding) → Network only
  if (url.hostname === 'nominatim.openstreetmap.org') {
    event.respondWith(networkOnly(request));
    return;
  }

  // Google Fonts → stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
    return;
  }

  // Ressources statiques de l'app → Network-first
  event.respondWith(networkFirst(request));
});

// ── STRATÉGIE : Network-first ─────────────────
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, networkResponse.clone()); // mise à jour silencieuse
    }
    return networkResponse;
  } catch {
    // Réseau indisponible → fallback cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback page offline pour les navigations HTML
    if (request.destination === 'document') {
      return caches.match('./offline.html');
    }

    // Ressource manquante
    return new Response('Ressource indisponible hors-ligne', { status: 503 });
  }
}

// ── STRATÉGIE : Network-only ──────────────────
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── STRATÉGIE : Stale-while-revalidate ────────
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  }).catch(() => null);

  return cached || await fetchPromise;
}

// ── MESSAGE : forcer mise à jour ──────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
