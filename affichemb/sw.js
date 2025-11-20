const CACHE = 'affichemb-v2025';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      './',
      'index.html',
      'style.css',
      'app.js',
      'manifest.json',
      'icon192.png',
      'icon512.png',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      'https://unpkg.com/leaflet-tilelayer-mbtiles@latest/dist/Leaflet.TileLayer.MBTiles.min.js'
    ]))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});