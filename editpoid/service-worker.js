const CACHE_NAME = "editpoid-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./js/app.js",
  "./js/leaflet.js",
  "./js/jszip.min.js",
  "./js/exif.js",
  "./js/sortable.min.js",
  "./css/leaflet.css",
  "./icons/icon192.png",
  "./icons/icon512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});