const CACHE = 'randoMB-offline-v10';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      '/',
      '/PWA/randoMB/',
      '/PWA/randoMB/index.html',
      '/PWA/randoMB/style.css',
      '/PWA/randoMB/script.js',
      '/PWA/randoMB/sw.js',
      '/PWA/randoMB/manifest.json',
      '/PWA/randoMB/icon192.png',
      '/PWA/randoMB/icon512.png',
      '/PWA/randoMB/leaflet.css',
      '/PWA/randoMB/leaflet.js',
      '/PWA/randoMB/sql-wasm.js',
      '/PWA/randoMB/sql-wasm.wasm',
      '/PWA/randoMB/L.TileLayer.MBTiles.js'
    ]))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});