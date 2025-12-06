self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("fastbinmark-cache").then(cache => cache.addAll([
      "./","./index.html","./main.js","./manifest.json"
    ]))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
