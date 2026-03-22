/* ═══════════════════════════════════════════════════════════
   villes2csv — sw.js  (Service Worker)
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'villes2csv-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icons/icon192.png',
  './icons/icon512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;800&family=DM+Mono:wght@400;500&display=swap'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static, network-first for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Nominatim / tile requests → network-first, no caching
  if (url.hostname.includes('nominatim') || url.hostname.includes('tile.openstreetmap') || url.hostname.includes('wxs.ign.fr')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
