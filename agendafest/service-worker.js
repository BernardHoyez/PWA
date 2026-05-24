const VERSION = 'agendafest-v3-' + Date.now();

const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', event => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(FILES))
  );
});

self.addEventListener('activate', event => {

  event.waitUntil(
    caches.keys().then(keys => {

      return Promise.all(
        keys.map(key => {

          if (key !== VERSION) {
            console.log('Suppression cache :', key);
            return caches.delete(key);
          }

        })
      );

    })
  );

  return self.clients.claim();
});

self.addEventListener('fetch', event => {

  event.respondWith(
    fetch(event.request)
      .then(response => {

        const responseClone = response.clone();

        caches.open(VERSION)
          .then(cache => {
            cache.put(event.request, responseClone);
          });

        return response;

      })
      .catch(() => caches.match(event.request))
  );
});
