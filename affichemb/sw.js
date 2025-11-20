const CACHE = 'affichemb-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      './',
      'index.html',
      'style.css',
      'app.js',
      'manifest.json',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      'https://unpkg.com/leaflet-tilelayer-mbtiles@0.0.1/Leaflet.TileLayer.MBTiles.js',
      'https://unpkg.com/sql.js@1.10.3/dist/sql-wasm.js',
      'https://unpkg.com/sql.js@1.10.3/dist/sql-wasm.wasm'
    ]))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});