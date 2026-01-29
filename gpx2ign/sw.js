const CACHE = "gpx2ign-cache-v1";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      "./",
      "./index.html",
      "./manifest.json",
      "./icon192.png",
      "./icon512.png"
    ]))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
