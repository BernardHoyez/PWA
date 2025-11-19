self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("randoMB-v1").then(cache =>
      cache.addAll([
        "./",
        "index.html",
        "app.js",
        "manifest.json",
        "icon192.png",
        "icon512.png"
      ])
    )
  );
});
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
