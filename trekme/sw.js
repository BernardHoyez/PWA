self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('trekme-v1').then(cache =>
      cache.addAll([
        '/PWA/trekme/',
        '/PWA/trekme/index.html',
        '/PWA/trekme/trekme.js',
        '/PWA/trekme/manifest.webmanifest',
        '/PWA/trekme/icon192.png',
        '/PWA/trekme/icon512.png'
      ])
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
