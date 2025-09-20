const CACHE_NAME = 'editgemi-cache-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './index.tsx',
  './manifest.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // External resources
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://unpkg.com/exifreader@4.21.1/dist/exif-reader.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://aistudiocdn.com/react@19.1.1/index.esm.js',
  'https://aistudiocdn.com/react-dom@19.1.1/client.esm.js'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all core assets to cache. `addAll` is atomic.
        return cache.addAll(URLS_TO_CACHE).catch(error => {
            console.error('Failed to cache one or more resources:', error);
            // Log which URL failed
            URLS_TO_CACHE.forEach(url => {
                fetch(url).catch(err => console.error(`Failed to fetch ${url}`, err));
            });
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache, so fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response. We don't want to cache errors.
            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.log('Fetch failed; user is likely offline.', error);
        });
      })
    );
});