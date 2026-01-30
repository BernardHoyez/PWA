const CACHE="wayloc-v1";

self.addEventListener("install",e=>{
 self.skipWaiting();
 e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll([
    "./",
    "./index.html",
    "./manifest.json",
    "./icon192.png",
    "./icon512.png"
  ]))
 );
});

self.addEventListener("activate",e=>{
 e.waitUntil(
  caches.keys().then(keys =>
   Promise.all(keys.map(k=>{
    if(k!==CACHE) return caches.delete(k);
   }))
  )
 );
 self.clients.claim();
});

self.addEventListener("fetch",e=>{
 e.respondWith(
  caches.match(e.request).then(r=>r||fetch(e.request))
 );
});
