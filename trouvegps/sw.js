self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('trouvegps-cache-v3').then(cache => {
      return cache.addAll(['./', './index.html', './app.js', './manifest.json', './exif.min.js']);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
