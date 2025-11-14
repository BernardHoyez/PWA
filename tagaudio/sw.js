const CACHE_NAME = "tagaudio-cache-v1";
const FILES = [
  "/PWA/tagaudio/",
  "/PWA/tagaudio/index.html",
  "/PWA/tagaudio/app.js",
  "/PWA/tagaudio/manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
