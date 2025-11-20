const CACHE_NAME = 'lirtuiles-v1';
const urlsToCache = [
  '/PWA/lirtuiles/',
  '/PWA/lirtuiles/index.html',
  '/PWA/lirtuiles/app.js',
  '/PWA/lirtuiles/icon192.png',
  '/PWA/lirtuiles/icon512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/sql.js@1.8.0/dist/sql-wasm.js',
  'https://unpkg.com/leaflet.tilelayer.mbtiles@1.0.0/Leaflet.TileLayer.MBTiles.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});