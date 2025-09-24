const CACHE_NAME = "visupoi-cache-v1";
const ASSETS = [
  "/PWA/visupoi/",
  "/PWA/visupoi/index.html",
  "/PWA/visupoi/js/main.js",
  "/PWA/visupoi/manifest.json",
  "/PWA/visupoi/icons/icon192.png",
  "/PWA/visupoi/icons/icon512.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/jszip/dist/jszip.min.js",
  "/PWA/visupoi/css/style.css"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
