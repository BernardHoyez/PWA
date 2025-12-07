const CACHE_NAME = 'cartomark-v1';
const urlsToCache = [
  '.',
  'index.html',
  'manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

## Structure des fichiers

Votre repo `BernardHoyez.github.io/PWA/cartomark` doit contenir :
```
cartomark/
├── index.html (le code de l'artifact ci-dessus)
├── manifest.json
├── sw.js
├── icon192.png (votre icône 192x192)
└── icon512.png (votre icône 512x512)