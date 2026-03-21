// psd2geo — Service Worker
const CACHE_NAME = 'psd2geo-v2.1.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Prendre le contrôle immédiatement sans attendre la fermeture des onglets
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Suppression ancien cache :', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Tuiles cartographiques → Network First (toujours fraîches)
  const isTile =
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('geopf.fr') ||
    url.hostname.includes('ign.fr') ||
    url.hostname.includes('arcgisonline') ||
    url.hostname.includes('cartocdn') ||
    url.hostname.includes('cdnjs.cloudflare');

  // Fichiers de l'app shell → Network First avec fallback cache
  // Garantit que les mises à jour sont toujours servies immédiatement
  const isAppShell =
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('sw.js') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('.png');

  if (isTile || isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Autres ressources → Cache First
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
