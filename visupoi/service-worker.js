const CACHE_NAME = 'visupoi-cache-v5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './bundle.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // External assets that are still needed
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  // The JS libraries that will be loaded by index.html before the bundle
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use addAll with a catch block to prevent installation failure if one asset is unavailable
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Failed to cache assets during install:', err);
        });
      })
      .then(() => self.skipWaiting()) // Activate new service worker immediately
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache first, then network fallback
        return response || fetch(event.request).catch(() => {
            // Optional: return a fallback page if network fails
            console.warn(`Fetch failed for: ${event.request.url}`);
        });
      }
    )
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
    }).then(() => self.clients.claim()) // Take control of all clients
  );
});
