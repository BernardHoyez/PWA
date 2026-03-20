// psd2geo — Service Worker
const CACHE_NAME = 'psd2geo-v2.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Stratégie : Network First pour les tuiles carto, Cache First pour le reste
  const url = new URL(event.request.url);

  const isTile =
    url.hostname.includes('tile') ||
    url.hostname.includes('ign.fr') ||
    url.hostname.includes('arcgis') ||
    url.hostname.includes('cartocdn') ||
    url.hostname.includes('cloudflare');

  if (isTile) {
    // Network First pour les tuiles (avec fallback cache)
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache First pour les assets de l'app
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
