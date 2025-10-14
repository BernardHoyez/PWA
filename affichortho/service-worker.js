self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('affichortho').then(cache =>
      cache.addAll([
        './',
        './index.html',
        './app.js',
        './style.css',
        './manifest.json',
        './icon-192.png',
        './icon-512.png',
        'https://unpkg.com/leaflet/dist/leaflet.css',
        'https://unpkg.com/leaflet/dist/leaflet.js'
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});