const CACHE_NAME = "kmz2kml-v1";
const FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon192.png",
  "./icon512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
