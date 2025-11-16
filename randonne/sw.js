self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('randonne-cache-v1').then(function(cache) {
      return cache.addAll([
        '.',
        'index.html',
        'styles.css',
        'main.js',
        'manifest.json',
        'sw-register.js',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
