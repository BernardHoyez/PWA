// Service Worker — cache d'application et interception des tuiles
const APP_CACHE = 'marche-app-v1';
const TILE_CACHE = 'marche-tiles-v1';
const APP_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/manifest.webmanifest',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Intercepter les tuiles (heuristique image ou pattern /{z}/{x}/{y}.png/.jpg)
  if (event.request.destination === 'image' || url.pathname.match(/\/\d+\/\d+\/\d+\.(png|jpg|jpeg|webp)$/)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.status === 200) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        } catch (err) {
          // si indisponible, renvoyer un fallback minimal (ici index)
          return caches.match('/index.html');
        }
      })
    );
    return;
  }

  // App shell : cache-first
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});