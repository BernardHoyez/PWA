const CACHE_NAME = "panorama-v1";
const urlsToCache = [
  "/PWA/panorama/",
  "/PWA/panorama/index.html",
  "/PWA/panorama/assets/styles.css",
  "/PWA/panorama/scripts/main.js",
  "/PWA/panorama/scripts/stitching.js",
  "/PWA/panorama/scripts/utils.js",
  "/PWA/panorama/lib/opencv.js",
  "/PWA/panorama/assets/icon192.png",
  "/PWA/panorama/assets/icon512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
