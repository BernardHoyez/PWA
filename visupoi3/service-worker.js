const CACHE_NAME = "visupoi3-cache-v1";
const urlsToCache = [
  "/PWA/visupoi3/",
  "/PWA/visupoi3/index.html",
  "/PWA/visupoi3/css/style.css",
  "/PWA/visupoi3/css/lightbox.css",
  "/PWA/visupoi3/js/app.js",
  "/PWA/visupoi3/js/map.js",
  "/PWA/visupoi3/js/zip-handler.js",
  "/PWA/visupoi3/js/utils.js",
  "/PWA/visupoi3/js/lightbox.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
