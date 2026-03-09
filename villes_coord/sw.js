const CACHE_NAME = 'villes_coord_v1';
const ASSETS = [
  '/PWA/villes_coord/',
  '/PWA/villes_coord/index.html',
  '/PWA/villes_coord/manifest.json',
  '/PWA/villes_coord/icons/icon192.png',
  '/PWA/villes_coord/icons/icon512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Nominatim requests: network only (requires internet)
  if (url.hostname === 'nominatim.openstreetmap.org') {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell: cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
